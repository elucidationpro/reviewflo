# Past Customer Outreach — Codebase Audit

This is the Step-1 deliverable of the Past Customer Outreach / CSV Campaigns feature plan. It records what already exists in the codebase that the new feature could reuse, conflict with, or build on top of.

## `review_requests` table — the per-send ledger

Defined in `supabase/migrations/20250311100000_pro_tier_schema.sql:40-57`, extended by `supabase/migrations/20260422120000_drip_pacing_review_requests.sql`.

Columns currently in use:
- `id`, `business_id` (FK businesses), `customer_name`, `customer_email`, `customer_phone` (added later), `optional_note`, `review_link`, `tracking_token`
- `status` (`pending | opened | clicked | completed | feedback`) — funnel progression
- `send_status` (`pending | scheduled | sent | failed`) — drip queue state
- `scheduled_for`, `queued_at`, `sent_at`, `reminder_sent`, `reminder_sent_at`, `opened_at`, `clicked_at`, `completed_at`, `rating`, `platform_chosen`, `created_at`

RLS: owner-scoped via `businesses.user_id = auth.uid()`; service role full access.

**Verdict:** `review_requests` is a *send ledger*, not a contact list. It does not overlap structurally with the new `campaign_contacts` table. We chose to keep campaign sends isolated in `campaign_contacts` so the existing outreach Funnel chart continues to reflect forward-automation only. (Decision confirmed with Jeremy.)

## Other contact / customer tables

None. Customer info (name, email, phone) lives inline on `review_requests`. There is no standalone `customers`/`contacts` table to reuse or collide with.

## Resend integration

- Single client: `lib/email-service.ts:3` — `new Resend(process.env.RESEND_API_KEY)`. 861 lines of email helpers.
- Review-request send: `sendReviewRequestEmail()` at `lib/email-service.ts:728`. Raw HTML template (no React Email), `resend.emails.send()`, `List-Unsubscribe` headers via `getListUnsubscribeHeaders()` at `:708` (points at `${BASE_URL}/api/unsubscribe` — that route does not currently exist; the new feature replaces this with per-campaign signed unsubscribe URLs).
- Reusable helpers: `escapeHtml()` at `:854`, constants `BASE_URL` (`NEXT_PUBLIC_APP_URL`) and `REVIEW_REQUEST_FROM`.
- Click tracking: `pages/api/track/click.ts` redirects through a token → updates `review_requests.status` to `clicked`. Open tracking is a no-op pixel (`pages/api/track/open.ts:12`) — opens are not tracked anywhere in the product.
- No Resend webhook routes. No React Email templates.

The new `sendCampaignEmail()` (added in `lib/email-service.ts` near the existing senders) follows the same shape: plain HTML, `escapeHtml`, `List-Unsubscribe` header, click-tracker CTA.

## Tier-gating pattern

`lib/tier-permissions.ts` — one predicate per gate:
- `canSendFromDashboard(tier)`, `canAccessGoogleStats(tier)`, `canUseAIFeatures(tier)`, `canUseSMS(tier)`, `canUseCRMIntegration(tier)`, `getMaxBusinessLocations(tier)`, etc.
- Pattern: each predicate returns `tier === 'pro' || tier === 'ai'` (or `tier === 'ai'` for AI-only features).

API routes use:
```ts
const ctx = await getAuthContext(req, res, '<select>')
if (!ctx) return
const tier = parseTier(ctx.business.tier)
if (!canX(tier)) return apiError(res, 403, '<message>')
```
(see `pages/api/send-review-request.ts:83`).

This feature adds **`canUseCampaigns(tier)`** (Pro/AI) and **`getMaxCampaignContacts(tier)`** (Free=0, Pro=500, AI=Infinity) to `lib/tier-permissions.ts`.

## Cron pattern

`vercel.json` holds the cron list; auth via `Authorization: Bearer ${CRON_SECRET}` in each route. Worker template: `pages/api/review-requests/process-scheduled.ts` — query due rows, loop up to 50, write status. The new `pages/api/campaigns/process-sends.ts` mirrors this exactly.

## Existing signed-token / HMAC pattern

None. No `crypto.createHmac` / `jsonwebtoken` usage in `pages` or `lib`. Built from scratch in `lib/campaign-tokens.ts` using Node's built-in `crypto` and a new `CAMPAIGN_SIGNING_SECRET` env var (falls back to `SUPABASE_SERVICE_ROLE_KEY` if missing so local dev works without extra setup).

## CSV parsing library

None installed. `package.json` has `resend`, `@supabase/supabase-js`, `stripe`, `twilio`, `recharts`, `@anthropic-ai/sdk`, `zod` — but no `papaparse`, `csv-parse`, `formidable`, or `busboy`. Decision: parse CSV server-side with a small custom RFC-4180 parser (`lib/csv-parse.ts`), and POST raw CSV text as JSON (`{ csv: string }`) instead of multipart, avoiding a `formidable` dependency. Capped at 4MB request and 50k rows.

## Outreach page structure

`pages/dashboard/outreach.tsx` (315 lines, no tabs): header with title + "Send Request" button → free-tier upgrade card (when applicable) → Funnel KPI chips + bars → `<ReviewRequestsList>` history → `<SendRequestModal>`. Uses `AppLayout`, `useBusiness()` context, brand tokens `#4A3428` / `#C9A961` / `#F5F5DC`. The new `<PastCustomerCampaigns>` mounts after `<ReviewRequestsList>` (line ~301), inheriting the same look-and-feel.

## Migration conventions

- Location: `supabase/migrations/`
- Naming: 14-digit timestamp `YYYYMMDDHHMMSS_<slug>.sql`
- RLS policies live in the same file as the table definition
- Mixed casing across files; the new migration uses lowercase `create table` to match the most recent file (`20260422120000_drip_pacing_review_requests.sql`).

New migration: `supabase/migrations/20260423120000_campaigns.sql` — three tables (`campaigns`, `campaign_contacts`, `unsubscribes`) with indexes and RLS. Applied to project `qawrdhxyadfmuxdzeslo` via Supabase MCP.

## Business fields used by sends

`businesses` columns referenced by the new send path: `id, business_name, slug, google_review_url, tier, user_id`. Review link priority: `google_review_url` if set, else `${BASE_URL}/${slug}`, else `BASE_URL`.

## Locked V1 decisions (confirmed with Jeremy)

1. **Email-only.** Phone is imported and deduped, but contacts without an email are marked `failed` with `error_message='no email for V1'` at send time.
2. **No funnel integration.** Campaign sends live only in `campaign_contacts`. The Funnel chart on `/dashboard/outreach` continues to reflect forward-automation sends only.
3. **30-day unsubscribe token expiry.** Tokens carry `iat`; rejected after 30 days. Unsubscribe DB rows are honored permanently regardless of token age.
4. **No open tracking.** UI surfaces `Sent / Clicked / Unsubscribed / Failed`. "Open rate" is intentionally absent.
