# Dashboard Audit

**Date:** 2026-04-22
**Scope:** pre-redesign audit only — no code changes yet.

---

## 1. Current pages in the app shell

| Route | File | Role |
|---|---|---|
| `/dashboard` | [pages/dashboard.tsx](pages/dashboard.tsx) | Overview. KPIs, review-count breakdown, GoogleStatsCard, Review Requests list, Review Link copy, upgrade card (free tier). |
| `/dashboard/reviews` | [pages/dashboard/reviews.tsx](pages/dashboard/reviews.tsx) | GBP reviews list + reply/AI draft (Pro/AI). New in Phase 2. |
| `/dashboard/analytics` | [pages/dashboard/analytics.tsx](pages/dashboard/analytics.tsx) | Two tabs: Review Funnel + Google Stats. |
| `/feedback` | [pages/feedback.tsx](pages/feedback.tsx) | Private feedback list from customers. |
| `/account` | [pages/account.tsx](pages/account.tsx) | Personal name, email, connected Google account, business tier badge. |
| `/settings` | [pages/settings.tsx](pages/settings.tsx) | Sub-nav: Branding, Review Links, Review Flow, SMS (AI), CRM (AI), AI Features (AI), Plan. |

## 2. Current sidebar nav (AppLayout)

1. Overview → `/dashboard`
2. Analytics → `/dashboard/analytics`
3. Reviews → `/dashboard/reviews`
4. Feedback → `/feedback`
5. Account → `/account`
6. Settings → `/settings`

All 6 are visible to every tier. That's good — gating happens on the page or API, not by hiding nav.

## 3. Duplicate widgets / data

**Google stats duplication (real problem):**
- `/dashboard` renders `<GoogleStatsCard>` — rating, total reviews, reviews this month.
- `/dashboard/analytics` "Google Stats" tab renders the same numbers plus trend chart from snapshots.
- Both pull from `/api/google-stats/fetch` + DB snapshots.
- **Recommendation:** keep the card on Overview as the daily glance; remove the Google Stats tab on Analytics (the trend chart is nice-to-have, not essential, and can live on Overview later if wanted).

**Avg Rating:**
- Overview Quick Stats "Avg Rating" is computed from the *internal* `reviews` table this month (what customers rate inside the ReviewFlo flow, 1-5).
- GoogleStatsCard shows the *Google* average rating.
- These are different metrics but the labels are confusingly similar. The internal avg is only meaningful for flow tuning — for the business owner, Google rating is the number that matters.
- **Recommendation:** relabel Overview Quick-Stats chip to "Flow Rating" (or remove) and promote Google rating to the primary KPI.

**Reply Rate** (Phase 3, new): lives on Overview only. No duplication.

**Review Funnel**: lives on Analytics only. Not duplicated.

**Conversion Rate**: Overview Quick Stats shows % of flows where a customer clicked a review platform. Analytics Funnel tab shows a similar stat. Not strictly duplicated but adjacent.

## 4. What lives where that shouldn't

- **Review Requests list + Send button** are inline on Overview (`<ReviewRequestsList>` + `<SendRequestModal>`). In the new model this is the Outreach page's job. Overview should just show a count + link.
- **Review Funnel** is on `/dashboard/analytics` with no standalone destination. In the new model it belongs on the Outreach page (the funnel *is* the outreach result).
- **Connected Accounts** (Google) is on `/account`. In the new model this belongs under Settings (there's already a "Google Reviews" card in `settings.tsx` that partially overlaps — Settings talks about the GBP *link*, Account talks about the *connected identity*). Merge into Settings.

## 5. Orphaned / placeholder pages

None truly empty. All pages render real content. But:
- `/dashboard/analytics` becomes structurally orphaned once Analytics is removed from nav. Its two tabs need homes:
  - **Review Funnel** → move to new `/dashboard/outreach`.
  - **Google Stats trend chart** → deprecate (keep date-range trending in a future version if users ask; Overview GoogleStatsCard already shows the current rating/count/monthly delta).
- `/account` becomes orphaned. Content merges into Settings — Personal Details + Connected Accounts become Settings sub-sections.

## 6. ROI removal status

Confirmed: no ROI component or block present in `pages/dashboard.tsx`. `RevenueTracker.tsx` still exists in `/components/` but is not imported by any dashboard page. Safe to leave alone (may be used elsewhere or in future).

## 7. Mobile / responsiveness

AppLayout already handles mobile: fixed top bar + hamburger + slide-over drawer. Sidebar collapses correctly. No work needed on this.

## 8. Tier gating state

- Free users: see full nav. `/dashboard/reviews` + `/dashboard/analytics` (Google tab) show proper gating messages — good "visible-but-gated" behavior.
- Pro: full access except AI features (AI draft button, SMS, CRM, AI template generator). These are hidden in sub-nav (Settings sub-nav conditionally renders AI items only for `tier === 'ai'`) → **should be visible with upgrade hint** per new rule.
- AI: full access.

**Gap:** Settings sub-nav hides SMS/CRM/AI Features entirely from Pro users. Per new rule, these should be visible-but-gated.

---

## Proposed new structure (for Jeremy to confirm)

**Sidebar (5 items):**
1. Overview — `/dashboard`
2. Reviews — `/dashboard/reviews` (exists)
3. Outreach — `/dashboard/outreach` (**new page** — wraps ReviewRequestsList + SendRequestModal + Review Funnel)
4. Feedback — `/feedback` (exists)
5. Settings — `/settings` (existing + Account merged in as new "Profile" sub-section)

**Pages removed from nav:**
- Analytics (contents merged: funnel → Outreach, Google stats → stays on Overview via GoogleStatsCard)
- Account (merged into Settings as "Profile" sub-section)

**Routes to delete or redirect:**
- `/dashboard/analytics` → redirect to `/dashboard/outreach` (preserve old bookmarks). File deleted.
- `/account` → redirect to `/settings?section=profile`. File deleted.

**Overview page after cleanup:**
- KPI row: Google rating · Total Google reviews · New reviews this month · Reply rate · Requests sent this month
- Alert strip (only when something to act on): Awaiting Reply banner (exists), broken Google connection, launch-list prompt
- Recent activity feed: last 5 reviews + last 5 requests sent (new component)
- Remove: inline Review Requests list, inline Send button, Quick Stats card with "Avg Rating/Pending Feedback/Conversion Rate/Reply Rate" — those numbers either duplicate Google stats or belong on Outreach/Reviews. Consolidate into the single KPI row.
- Keep: Review Link copy card, upgrade card (free tier), launch list card (free tier w/ preference).

---

## Judgment calls needing Jeremy's input

1. **Delete Analytics page, or keep as an "advanced" page accessible via deep link?**
   Recommendation: delete. Its value is split between Overview (glance) and Outreach (funnel details). Keeping it creates another URL to maintain.

2. **What becomes of the Google stats trend chart (last 30/7/90 days sparkline)?**
   Recommendation: drop for now. Nobody has asked for it, and the Overview card already shows deltas ("+X this month"). If needed later, add back on Overview, not on a separate page.

3. **Merge Account into Settings as a new sub-section, or as fields inside existing "Plan" section?**
   Recommendation: new sub-section at the top called "Profile" (Name, Email, Connected Accounts). Matches the UX of most apps and keeps Plan focused on billing.

4. **Overview KPI row — 5 cards or a mix with "secondary" widgets below?**
   Recommendation: 5-card KPI row on top, then alert strip, then recent activity, then review-link card. Secondary stats (Pending Feedback count, Conversion Rate) become small inline numbers in the activity section, not their own cards.

5. **"Recent activity feed" — new data plumbing needed. Hit the existing `/api/google-reviews/list` (cached in client state) for reviews, and a new `/api/review-requests?limit=5` endpoint for requests?**
   Recommendation: reuse existing. No new API needed — feedback table, `reviews` or GBP list, and `review_requests` table can all be queried directly with the supabase client on the page mount.

6. **Tier-gating on Settings sub-nav: make SMS/CRM/AI Features visible with upgrade hint for Pro users?**
   Recommendation: yes, per the new rule ("visible-but-gated is less confusing than hidden").

---

## Out of scope (for this pass)

- No backend / API changes
- No database migrations
- No new AI features (Phase 3 AI draft already done)
- No marketing page changes
- No redirect to /onboarding changes
- `/feedback` page itself will be lightly touched (empty state, loading skeleton) but its logic stays

