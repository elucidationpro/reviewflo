# ReviewFlo Automated Tracking System

## How It Works

ReviewFlo automatically collects performance data for Pro and AI tier businesses every day, with no manual work required.

### What Gets Tracked Automatically

**Google Business Profile Stats** (daily, midnight cron)
- Total review count and average star rating
- Week-over-week and month-over-month changes
- Fetched via Google Business Profile OAuth (all reviews) or Places API fallback (5 reviews)
- Stored as daily snapshots so trends can be charted over time

**Review Request Funnel** (real-time, updated on each action)
- Sent → Opened → Clicked → Completed
- Each status change is stored with a timestamp
- Platform selection (Google, Facebook, Yelp) is recorded when a customer clicks

**Revenue Attribution** (manual entry via dashboard)
- Businesses log which customers came from Google reviews
- Monthly summaries are auto-calculated on each entry

### Data Flow

```
Daily cron (midnight UTC)
  → Fetch stats for all Pro/AI businesses
  → Upsert into google_business_snapshots (one row per business per day)
  → Update google_business_stats (current-state cache)

Customer receives review request email
  → Opens review link → status: 'opened', opened_at set
  → Clicks platform button → status: 'clicked', platform_selected set
  → Completes review → status: 'completed'

Business logs a sale in dashboard
  → Inserted into revenue_attribution
  → recalculate_monthly_summary() runs automatically
  → monthly_attribution_summary updated

Weekly cron (Monday 9am)
  → Fetch last 7 days of data for each Pro/AI business
  → Send weekly email report via Resend
```

### Privacy Considerations

- Customer names in revenue attribution are optional and visible only to the business owner
- Row-Level Security (RLS) ensures each business can only see their own data
- Admin endpoints require verified admin role (not just email match)
- Google OAuth tokens are stored encrypted by Supabase; refresh tokens are never exposed via API

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `google_business_snapshots` | Daily Google stats history for trend charts |
| `google_business_stats` | Current-state cache (single row per business) |
| `revenue_attribution` | Individual sales entries with attribution source |
| `monthly_attribution_summary` | Auto-calculated monthly rollup per business |
| `review_requests` | Each outbound request with status tracking |

---

## Cron Jobs

| Job | Schedule | Path |
|-----|----------|------|
| Fetch Google Stats | Daily at midnight | `/api/cron/fetch-google-stats` |
| Send Reminders | Daily at 9am | `/api/cron/send-reminders` |
| Weekly Reports | Monday at 9am | `/api/cron/send-weekly-reports` |

All crons are secured with `CRON_SECRET` (set in Vercel environment variables).
