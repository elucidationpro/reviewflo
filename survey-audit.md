## Survey email delivery audit (Review Request + Reminder)

### What this flow is supposed to do

- **Trigger (manual)**: In the dashboard, a business owner sends a “Rate your experience” email to a customer via `POST /api/send-review-request`.
  - Creates a `review_requests` row with a `tracking_token`.
  - If drip-limited, it **schedules** the send by writing `send_status='scheduled'` + `scheduled_for`.
  - Otherwise, it sends immediately via `sendReviewRequestEmail(...)` in `lib/email-service.ts`.
- **Trigger (automatic)**: `pages/api/cron/send-reminders.ts` runs and sends a reminder email to requests that were sent \(>3 days ago\) but haven’t completed, then sets `reminder_sent=true`.
- **Customer journey tracking**:
  - CTA link goes to `/api/track/click?t=<token>` which updates `review_requests.status` and redirects the customer to the business review page with `?t=<token>`.
  - Completion is recorded via `/api/track/complete` \(POST\).

### Where it was breaking

- **Most likely failure point (email provider rejection)**: `sendReviewRequestEmail` / `sendReviewReminderEmail` were sending from:
  - `${businessName} via ReviewFlo <reviews@usereviewflo.com>`
  - If `reviews@usereviewflo.com` is not an allowed/verified sender in Resend (or domain verification changed), Resend will reject the send, resulting in `send_status='failed'` and no email delivery.

### Fix implemented

- **Sender address hardening**: Review request + reminder emails now default to a single known sender:
  - `REVIEW_REQUEST_FROM` env override (optional), otherwise `Jeremy at ReviewFlo <jeremy@usereviewflo.com>`.
- **Basic provider compliance**: Added `List-Unsubscribe` headers to review request + reminder emails.
- **Dev-only manual test endpoint**: Added `POST /api/survey/send-test` that takes `{ email, business_id }` and sends a single real survey/review-request email using the real business slug/name.
- **Logging**: Added `[SURVEY]` logs for trigger + success/failure in:
  - `pages/api/send-review-request.ts`
  - `pages/api/cron/send-reminders.ts`
  - `pages/api/survey/send-test.ts`

### Judgment calls / assumptions

- The prompt said “survey email delivery”, but the closest production flow is the **review request / reminder** email system. I treated that as the “survey” email referenced in the prompt.
- I assumed the “from” address `reviews@usereviewflo.com` was the most likely root cause, because it’s different from other emails in the codebase and is a common Resend rejection source.
- There was no existing unsubscribe endpoint; I added headers pointing to a generic `/api/unsubscribe` URL for one-click compatibility, but did **not** implement persistence of unsubscribe state (no table/UX existed). If you want true unsubscribe enforcement, we should add an `unsubscribes` table + suppression check before sends.

