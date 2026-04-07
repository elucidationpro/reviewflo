# Current Tracking State — ReviewFlo Audit

*Generated: 2026-03-28*

---

## 1. Database Tables (Confirmed Existing)

### `businesses`
Core business record. Confirmed fields relevant to tracking:
- `id`, `user_id`, `business_name`, `slug`, `tier` ('free' | 'pro' | 'ai')
- `google_review_url`, `google_place_id` (cached)
- `google_oauth_access_token`, `google_oauth_refresh_token`, `google_oauth_expires_at`
- `interested_in_tier`, `notify_on_launch`, `launch_discount_eligible`

### `review_requests`
Tracks each outbound review request sent via dashboard. Confirmed fields:
- `id`, `business_id`, `customer_name`, `customer_email`
- `optional_note`, `review_link`, `status`
- `sent_at`, `reminder_sent`, `reminder_sent_at`

**Status values in use:** `pending` | `opened` | `clicked` | `completed` | `feedback`

> ⚠️ **Gap:** Status transitions to `opened`, `clicked`, `completed` are referenced in code but no API route or webhook updates these statuses. The review link goes directly to the ReviewFlo slug page — there is no tracking redirect or pixel. Status stays `pending` for almost all requests.

### `google_business_stats`
Single-row-per-business stats cache. Confirmed fields (from upsert in refresh.ts):
- `business_id`, `total_reviews`, `average_rating`
- `recent_reviews` (JSONB array, last 5 via Places API or all via GBP OAuth)
- `reviews_this_month` (always set to `null` — not calculated)
- `last_fetched`

> ⚠️ **Gap:** This is a single current-state record, not a time-series. There is no snapshot history, so week-over-week or month-over-month comparison is impossible.

### `reviews`
Internal ReviewFlo platform reviews (star ratings collected on the slug page). Fields:
- `business_id`, `star_rating`, `created_at`

> Note: These are NOT Google reviews — they're the rating collected before routing to Google.

### `feedback`
Private negative feedback from customers who rated 1–4 stars:
- `business_id`, `star_rating`, `what_happened`, `how_to_make_right`
- `wants_contact`, `email`, `phone`, `is_resolved`, `created_at`

### Missing Tables (Need to Create)
- ❌ `google_business_snapshots` — daily historical snapshots for trend tracking
- ❌ `revenue_attribution` — manual sales attribution entries
- ❌ `monthly_attribution_summary` — aggregated monthly attribution data

---

## 2. What's Working vs. Broken

### ✅ WORKING

**Review request sending:**
- Dashboard sends email via Resend (`sendReviewRequestEmail`)
- Record inserted into `review_requests` with status `pending`
- Reminder cron (`/api/cron/send-reminders`) runs daily at 9am, catches requests pending >3 days

**Google stats (manual refresh):**
- `/api/google-stats/refresh` (POST) — fully functional
- Supports two sources: Google Business Profile OAuth (all reviews) and Places API fallback (5 reviews)
- Upserts into `google_business_stats` table
- Auto-refreshes on dashboard load via `GoogleStatsCard` component

**Google OAuth flow:**
- Full OAuth implemented for GBP access (`lib/google-business-profile.ts`)
- Access/refresh tokens stored in `businesses` table
- Token refresh logic in place

**PostHog events being fired:**
- `business_onboarded` (dashboard load)
- `customer_responded` (star rating selected on slug page)
- `private_feedback_submitted` (negative feedback form)
- `template_selected` (template chosen)
- `platform_selected` + `five_star_to_google` (platform button clicked)
- `review_path_selected` (write own vs use template)
- `upgrade_card_viewed` (dashboard)
- `pricing_viewed_from_dashboard`
- Standard `$pageview` on all routes

**Tier gating:**
- All tier checks centralized in `lib/tier-permissions.ts`
- `canSendFromDashboard`, `canAccessGoogleStats` etc. work correctly

### ❌ BROKEN / NOT IMPLEMENTED

**Email open tracking:**
- Resend is used for sending but no open tracking webhooks configured
- `review_requests.status` never gets updated to `opened` — no pixel or webhook
- Resend supports email open/click webhooks but they're not set up

**Link click tracking:**
- Review link points directly to `usereviewflo.com/{slug}` — no tracking redirect
- No `/api/track/click?id=...` endpoint exists
- Status never updates to `clicked`

**Review completion tracking:**
- When a customer rates 5 stars and visits Google, there's no callback
- Status never updates to `completed` or `posted`
- The templates page tracks PostHog event `five_star_to_google` but doesn't update DB status

**Platform selection tracking in DB:**
- PostHog captures `platform_selected` but `review_requests` has no `platform` column
- No way to query "how many went to Google vs Facebook"

**`reviews_this_month` field:**
- Always saved as `null` in the refresh endpoint — calculation is commented out/missing

**Google stats history:**
- `google_business_stats` is a single row (upserted), no history
- Cannot show trends, week-over-week changes, or before/after comparisons

---

## 3. API Integrations

### Google Places API
- **Status:** ✅ Configured (`GOOGLE_PLACES_API_KEY` in env)
- `lib/google-places.ts` — Place ID extraction, validation, text search
- Used as fallback in stats refresh when no OAuth

### Google Business Profile OAuth API
- **Status:** ✅ Fully implemented
- `lib/google-business-profile.ts` — full OAuth flow, account/location fetch, reviews fetch
- Tokens stored per-business in `businesses` table

### Resend (Email)
- **Status:** ✅ Configured (`RESEND_API_KEY` in env)
- Sends review requests, reminders, magic links, admin notifications, weekly emails
- **⚠️ Open/click webhooks NOT configured** — missing `RESEND_WEBHOOK_SECRET` and handler

### PostHog
- **Status:** ✅ Configured (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`)
- Client-side only — no server-side PostHog calls in API routes
- No PostHog tracking in cron jobs or backend processes

### Stripe
- **Status:** Webhook exists (`/api/webhooks/stripe`) — payment infrastructure present

### Twilio (SMS)
- **Status:** Code exists (`lib/sms-service.ts`, `/api/sms/`) — AI tier feature

---

## 4. Summary: What Needs to Be Built

| Feature | Status | Notes |
|---------|--------|-------|
| Review funnel tracking (opened/clicked) | ❌ Missing | Need tracking redirect + Resend webhook |
| Review completion tracking | ❌ Missing | Can't detect Google posting |
| Google stats history/snapshots | ❌ Missing | Need `google_business_snapshots` table + daily cron |
| Revenue attribution | ❌ Missing | Entire feature to build |
| ROI calculation | ❌ Missing | Depends on revenue attribution |
| Analytics dashboard | ❌ Missing | New page needed |
| Case study export | ❌ Missing | PDF generation feature |
| Admin analytics view | ❌ Missing | Aggregate view needed |
| Automated weekly reports | ❌ Missing | New cron needed |
| `reviews_this_month` calculation | ❌ Broken | Field exists, always null |

---

## 5. Recommended Tracking Improvements (Pre-requisite for Accuracy)

Before analytics are meaningful, two quick wins should be done:

1. **Add tracking redirect:** Change review link from `usereviewflo.com/{slug}` to `usereviewflo.com/api/track/open?id={request_id}` — updates status to `opened` on page visit and `clicked` on platform click.

2. **Add platform column to `review_requests`:** Track which platform (Google/Facebook/Yelp) each customer clicked.

These are included in the migration and implementation plan.
