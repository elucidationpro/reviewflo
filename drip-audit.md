# Drip pacing audit (ReviewFlo)

**Date:** 2026-04-22  
**Goal:** Prevent “flood” patterns by enforcing a per-business daily send limit and queueing/scheduling excess review requests.

## How review requests are currently triggered

- **Manual send (email, dashboard UI)**
  - UI: `components/SendRequestModal.tsx`
    - Submits `POST /api/send-review-request` with `customerName`, `customerEmail`, `optionalNote`.
  - Page: `pages/dashboard/outreach.tsx`
    - Opens `SendRequestModal`, then refetches analytics/list on success.

- **Manual send (SMS, dashboard UI)**
  - API: `POST /api/sms/send-review-request`
  - (UI entry point not audited yet in detail, but API exists and is used for AI tier SMS outreach.)

## API route(s) that actually send via Resend / Twilio

- **Email (Resend)**
  - Route: `pages/api/send-review-request.ts`
  - Flow:
    - Auth via Supabase Admin `auth.getUser(token)`
    - Loads business (and tier) from `businesses`
    - Inserts row into `review_requests`
    - Sends email via `lib/email-service.ts` → `sendReviewRequestEmail()` (Resend)
    - Returns `{ success: true, id, emailSent }`

- **SMS (Twilio)**
  - Route: `pages/api/sms/send-review-request.ts`
  - Flow:
    - Auth via Supabase Admin `auth.getUser(token)`
    - Loads business (tier + sms settings)
    - Sends SMS via `lib/sms-service.ts` → `sendReviewRequestSMS()`
    - Inserts row into `review_requests`
    - Returns `{ success: true, request }`

## Existing rate limiting / queuing logic

- **None.** Both email and SMS routes send immediately (or in quick succession) when called, with no daily cap per business and no scheduling.

## `review_requests` table structure (as defined in migrations)

Defined in `supabase/migrations/20250311100000_pro_tier_schema.sql` and updated in `supabase/migrations/20250316100000_ai_tier_schema.sql`.

- **Core columns**
  - `id uuid primary key default uuid_generate_v4()`
  - `business_id uuid not null references businesses(id)`
  - `customer_name text not null`
  - `customer_email text` (made nullable for SMS in AI tier migration)
  - `customer_phone text` (added for SMS)
  - `optional_note text`
  - `review_link text not null`
  - `sent_at timestamptz default now()` (used throughout as “sent time”)
  - `status text default 'pending'` (funnel state: `pending|opened|clicked|completed|feedback`)
  - `reminder_sent boolean default false`, `reminder_sent_at timestamptz`
  - `opened_at`, `clicked_at`, `completed_at`
  - `sent_via text default 'email'` (added for SMS)
  - `triggered_by text`
  - `created_at timestamptz default now()`

- **Usage expectations in code**
  - `pages/api/review-requests/list.ts` orders results by `sent_at desc`.
  - `pages/api/review-requests/stats.ts` counts rows with `sent_at >= first-of-month` to compute “sent”.
  - `pages/api/cron/send-reminders.ts` uses `sent_at` and `reminder_sent=false` to decide reminder eligibility.

## Notes / implications for drip pacing

- To support scheduled sends, we will need new queue/scheduling fields on `review_requests` and **ensure scheduled rows don’t count as “sent today”** until actually delivered.
- Since `sent_at` currently defaults to `now()` on insert, scheduled rows must explicitly insert `sent_at = null` (and later set `sent_at` when the worker sends).

