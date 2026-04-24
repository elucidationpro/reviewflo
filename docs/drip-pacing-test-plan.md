## Drip pacing test plan (local)

### Prereqs

- Apply migration `supabase/migrations/20260422120000_drip_pacing_review_requests.sql` to your Supabase project.
- Ensure `CRON_SECRET` is set in your env (already used by existing cron routes).
- Run dev server: `npm run dev`

### Test: 15 email sends (expect 10 today, 5 queued)

1. Log in as a **Pro** (or **AI**) business.
2. Go to `Outreach` → click **Send Request**.
3. Send **15** requests in quick succession (use distinct emails).

**Expected**

- First ~10 should return immediate send and show **“Request sent!”**
- Remaining ~5 should show a green success banner like **“Your request is scheduled for …”**
- In the **Review Requests** table:
  - queued rows show **delivery status = `scheduled`** and a **scheduled timestamp**
  - immediate rows show **delivery status = `sent`**

### Test: Scheduled processor

1. In Supabase, update one of the scheduled rows so `scheduled_for` is in the past (e.g. now minus 1 minute).
2. Call the worker locally:
   - `GET /api/review-requests/process-scheduled`
   - Include `Authorization: Bearer <CRON_SECRET>` if your env requires it.

**Expected**

- Response reports `sent >= 1`
- Row is updated to `send_status = 'sent'` and `sent_at` set.

### Test: Daily cap enforcement logic

- Confirm that calling the send endpoint after reaching the limit continues to return `queued: true`
- Confirm no `scheduled_for` is ever set beyond 30 days out (defensive cap)

