# Client Conversion Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface PostHog-accurate conversion percentages on the client dashboard overview and analytics sub-page, visible to all tiers.

**Architecture:** Extend the existing `GET /api/analytics/dashboard-data` endpoint with a new per-business PostHog HogQL query, run in parallel with the existing DB queries. Both client pages consume the same endpoint — the main dashboard shows a single clean number in the Quick Stats card; the analytics sub-page shows a richer card with platform breakdown and info tooltips on all rate metrics.

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, PostHog HogQL API, Supabase

---

## File Map

| File | Change |
|---|---|
| `lib/posthog-conversions-query.ts` | Add `fetchPosthogConversionsForBusiness(businessId, startIso)` |
| `pages/api/analytics/dashboard-data.ts` | Import new function, run in parallel with review_requests query, add `posthogConversions` field to response |
| `pages/dashboard.tsx` | Add state + useEffect to fetch dashboard-data; add 3rd row to Quick Stats card |
| `pages/dashboard/analytics.tsx` | Add `PosthogConversions` to `DashboardData` interface; add `InfoDot` component; add info dots to KPI strip; add PostHog conversions card |

---

### Task 1: Add `fetchPosthogConversionsForBusiness` to the PostHog query lib

**Files:**
- Modify: `lib/posthog-conversions-query.ts`

- [ ] **Step 1: Open the file and locate the end of `fetchPosthogPlatformConversions`**

Read `lib/posthog-conversions-query.ts`. The existing `PlatformBreakdown` type and `posthogHogqlQuery` / `parseHogqlTable` / `colIndex` helpers are already defined — the new function reuses them all.

- [ ] **Step 2: Append the new function after the final export**

Add this block at the very end of `lib/posthog-conversions-query.ts`:

```ts
/**
 * Returns PostHog platform_selected data for a single business.
 * Used by the client-facing analytics API.
 * Returns null if PostHog is not configured or the request fails.
 */
export async function fetchPosthogConversionsForBusiness(
  businessId: string,
  startIso: string
): Promise<{ uniquePersons: number; platformBreakdown: PlatformBreakdown } | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const base = posthogApiBase()
  if (!apiKey || !projectId || !base) return null

  const escapedStart = startIso.replace(/'/g, "\\'")
  const escapedId = businessId.replace(/'/g, "\\'")

  const uniqQuery = `
    SELECT uniqExact(person_id) AS conversions
    FROM events
    WHERE event = 'platform_selected'
      AND timestamp >= parseDateTimeBestEffort('${escapedStart}')
      AND timestamp <= now()
      AND toString(properties.businessId) = '${escapedId}'
  `

  const breakdownQuery = `
    SELECT
      lower(toString(properties.platform)) AS plat,
      count() AS cnt
    FROM events
    WHERE event = 'platform_selected'
      AND timestamp >= parseDateTimeBestEffort('${escapedStart}')
      AND timestamp <= now()
      AND toString(properties.businessId) = '${escapedId}'
    GROUP BY plat
  `

  try {
    const [uniqJson, brJson] = await Promise.all([
      posthogHogqlQuery(uniqQuery, 'client_analytics_platform_conversions_uniq'),
      posthogHogqlQuery(breakdownQuery, 'client_analytics_platform_conversions_breakdown'),
    ])
    if (!uniqJson || !brJson) return null

    const uniqTable = parseHogqlTable(uniqJson)
    const brTable = parseHogqlTable(brJson)

    const cIdx = colIndex(uniqTable.columns, 'conversions')
    const uniquePersons =
      cIdx >= 0 && uniqTable.rows.length > 0 ? Number(uniqTable.rows[0]![cIdx] ?? 0) : 0

    const platformBreakdown: PlatformBreakdown = { google: 0, facebook: 0, yelp: 0, nextdoor: 0 }
    const platIdx = colIndex(brTable.columns, 'plat')
    const cntIdx = colIndex(brTable.columns, 'cnt')
    if (platIdx >= 0 && cntIdx >= 0) {
      for (const row of brTable.rows) {
        const plat = String(row[platIdx] ?? '').toLowerCase()
        const cnt = Number(row[cntIdx] ?? 0)
        if (plat === 'google') platformBreakdown.google += cnt
        else if (plat === 'facebook') platformBreakdown.facebook += cnt
        else if (plat === 'yelp') platformBreakdown.yelp += cnt
        else if (plat === 'nextdoor') platformBreakdown.nextdoor += cnt
      }
    }

    return { uniquePersons, platformBreakdown }
  } catch (e) {
    console.warn('[posthog-conversions-for-business] failed', e)
    return null
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If you see errors referencing `PlatformBreakdown`, verify it is exported or defined before the new function in the same file.

- [ ] **Step 4: Commit**

```bash
git add lib/posthog-conversions-query.ts
git commit -m "feat(posthog): add fetchPosthogConversionsForBusiness for client analytics"
```

---

### Task 2: Extend `dashboard-data.ts` to include PostHog conversions

**Files:**
- Modify: `pages/api/analytics/dashboard-data.ts`

- [ ] **Step 1: Add the import at the top of the file**

After the existing imports in `pages/api/analytics/dashboard-data.ts`, add:

```ts
import { fetchPosthogConversionsForBusiness } from '../../../lib/posthog-conversions-query'
```

- [ ] **Step 2: Run the PostHog query in parallel with the review_requests DB query**

Find this block (around line 93):

```ts
const { data: requests } = await supabaseAdmin
  .from('review_requests')
  .select('status, platform_selected, opened_at, clicked_at')
  .eq('business_id', business.id)
  .gte('sent_at', startIso)
```

Replace it with:

```ts
const [requestsResult, posthogResult] = await Promise.all([
  supabaseAdmin
    .from('review_requests')
    .select('status, platform_selected, opened_at, clicked_at')
    .eq('business_id', business.id)
    .gte('sent_at', startIso),
  fetchPosthogConversionsForBusiness(business.id, startIso),
])
const { data: requests } = requestsResult
```

- [ ] **Step 3: Assemble the `posthogConversions` object**

Find the closing of the `funnel` object (around line 131 — right after `platformBreakdown: platformCounts,`). After the `funnel` const definition, add:

```ts
const posthogConversions = posthogResult !== null
  ? {
      conversionRate: funnelSent > 0
        ? Math.round((posthogResult.uniquePersons / funnelSent) * 100)
        : 0,
      uniquePersons: posthogResult.uniquePersons,
      platformBreakdown: posthogResult.platformBreakdown,
      source: 'posthog' as const,
    }
  : {
      conversionRate: funnel.completionRate,
      uniquePersons: funnelCompleted,
      platformBreakdown: { google: 0, facebook: 0, yelp: 0, nextdoor: 0 },
      source: 'database' as const,
    }
```

- [ ] **Step 4: Add `posthogConversions` to the response**

Find the `return res.status(200).json({` block near the bottom. Add `posthogConversions` to it:

```ts
return res.status(200).json({
  businessId: business.id,
  businessName: business.business_name,
  tier: business.tier,
  dateRange: { days, startDate: startIso },
  ratingPage,
  funnel,
  googleStats,
  revenue: revenueData,
  roi,
  posthogConversions,
  generatedAt: new Date().toISOString(),
})
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Smoke-test the endpoint manually**

```bash
# Get a session token from the browser (DevTools → Application → Local Storage → supabase session → access_token)
curl "http://localhost:3000/api/analytics/dashboard-data?days=30" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq '.posthogConversions'
```

Expected output shape:
```json
{
  "conversionRate": 68,
  "uniquePersons": 42,
  "platformBreakdown": { "google": 35, "facebook": 5, "yelp": 2, "nextdoor": 0 },
  "source": "posthog"
}
```
If PostHog env vars are not set locally, `source` will be `"database"` — that's expected.

- [ ] **Step 7: Commit**

```bash
git add pages/api/analytics/dashboard-data.ts
git commit -m "feat(api): include PostHog conversion data in dashboard-data endpoint"
```

---

### Task 3: Add Conversion Rate row to the main dashboard Quick Stats card

**Files:**
- Modify: `pages/dashboard.tsx`

- [ ] **Step 1: Add state for conversion data**

In `pages/dashboard.tsx`, find the existing `useState` declarations near the top of `DashboardPage`. After the `pendingFeedbackCount` state line, add:

```ts
const [conversionRate, setConversionRate] = useState<number | null>(null)
const [funnelSent, setFunnelSent] = useState<number>(0)
```

- [ ] **Step 2: Add a useEffect to fetch dashboard-data after business loads**

After the existing `useEffect` that calls `checkAuthAndFetchData`, add:

```ts
useEffect(() => {
  if (!business) return
  ;(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch('/api/analytics/dashboard-data?days=30', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setConversionRate(json.posthogConversions?.conversionRate ?? null)
      setFunnelSent(json.funnel?.sent ?? 0)
    } catch {
      // silent — conversion rate stays null (shown as —)
    }
  })()
}, [business])
```

- [ ] **Step 3: Add the Conversion Rate row to the Quick Stats card**

Find the Quick Stats card in the JSX (around line 531). It currently has two `p-3 bg-gray-50 rounded-xl` rows: Avg Rating and Pending Feedback. Add a third row immediately after the Pending Feedback row:

```tsx
<div className="p-3 bg-gray-50 rounded-xl">
  <p className="text-xs text-gray-500 mb-0.5">Conversion Rate</p>
  <p className="text-2xl font-bold text-gray-900">
    {conversionRate !== null && funnelSent > 0 ? `${conversionRate}%` : '—'}
  </p>
  <p className="text-xs text-gray-400">clicked a review platform</p>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Check in the browser**

Run `npm run dev`, open `http://localhost:3000/dashboard`. The Quick Stats card should now have three rows. If no review requests have been sent, it shows `—`. If requests exist and PostHog has data, shows e.g. `68%`.

- [ ] **Step 6: Commit**

```bash
git add pages/dashboard.tsx
git commit -m "feat(dashboard): add conversion rate to Quick Stats card"
```

---

### Task 4: Enhance the analytics sub-page with InfoDot and PostHog conversions card

**Files:**
- Modify: `pages/dashboard/analytics.tsx`

- [ ] **Step 1: Add `PosthogConversions` to the `DashboardData` interface**

In `pages/dashboard/analytics.tsx`, find the `DashboardData` interface (around line 61):

```ts
interface DashboardData {
  businessName: string
  tier: string
  ratingPage: RatingPageData
  funnel: FunnelData
  googleStats: GoogleStats | null
}
```

Replace it with:

```ts
interface PosthogConversions {
  conversionRate: number
  uniquePersons: number
  platformBreakdown: { google: number; facebook: number; yelp: number; nextdoor: number }
  source: 'posthog' | 'database'
}

interface DashboardData {
  businessName: string
  tier: string
  ratingPage: RatingPageData
  funnel: FunnelData
  googleStats: GoogleStats | null
  posthogConversions: PosthogConversions
}
```

- [ ] **Step 2: Add the `InfoDot` component**

After the `SectionHeader` component definition (around line 97), add:

```tsx
function InfoDot({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex items-center ml-1 cursor-help">
      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span className="invisible group-hover/tip:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg z-10 pointer-events-none">
        {text}
      </span>
    </span>
  )
}
```

- [ ] **Step 3: Add info dots to the KPI strip**

Find the KPI strip array (around line 366). It currently maps over plain objects with `label`, `value`, `sub`. Replace the entire array + map with one that includes a `tip` field:

```tsx
{[
  {
    label: 'Sent',
    value: data.funnel.sent,
    sub: null,
    tip: null,
  },
  {
    label: 'Opened',
    value: data.funnel.opened,
    sub: `${data.funnel.openRate}% open rate`,
    tip: 'Percentage of review requests that were opened by the recipient.',
  },
  {
    label: 'Clicked platform',
    value: data.funnel.clicked,
    sub: data.funnel.opened > 0 ? `${data.funnel.clickRate}% of opened` : null,
    tip: 'Percentage of openers who tapped through to your rating page link.',
  },
  {
    label: 'Completed',
    value: data.funnel.completed,
    sub: `${data.funnel.completionRate}% of sent`,
    tip: 'Percentage of sent requests where the customer completed the review flow in our system.',
  },
].map((item) => (
  <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
    <div className="text-2xl font-bold text-gray-900">{item.value}</div>
    <div className="text-xs font-medium text-gray-500 mt-1 flex items-center justify-center">
      {item.label}
      {item.tip && <InfoDot text={item.tip} />}
    </div>
    {item.sub && <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>}
  </div>
))}
```

- [ ] **Step 4: Add the PostHog conversions card**

Find the existing "Conversion bar" card (the `bg-white rounded-2xl` div with "Sent → Completed" label, around line 382). Add the PostHog conversions card immediately **after** that closing `</div>` and before the platform breakdown section:

```tsx
{/* PostHog conversion card */}
<div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm font-semibold text-gray-700 flex items-center">
      Platform Conversions
      <InfoDot text="Unique customers who clicked Google, Facebook, or another review platform — tracked directly by PostHog for the most accurate count." />
    </span>
    <span className="text-sm font-semibold text-emerald-700">
      {data.posthogConversions.conversionRate}% conversion
    </span>
  </div>
  <div className="h-3 bg-emerald-100 rounded-full overflow-hidden mb-4">
    <div
      className="h-full rounded-full bg-emerald-500 transition-all duration-700"
      style={{ width: `${Math.min(data.posthogConversions.conversionRate, 100)}%` }}
    />
  </div>
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
    {(['google', 'facebook', 'yelp', 'nextdoor'] as const).map((plat) => {
      const count = data.posthogConversions.platformBreakdown[plat]
      if (plat !== 'google' && count === 0) return null
      return (
        <div key={plat} className="bg-white rounded-xl p-2.5 border border-emerald-100">
          <div className="text-lg font-bold text-gray-900">{count}</div>
          <div className="text-xs text-gray-500 capitalize">{plat}</div>
        </div>
      )
    })}
  </div>
  {data.posthogConversions.source === 'database' && (
    <p className="text-xs text-gray-400 italic mt-3">Using system data — PostHog not available</p>
  )}
</div>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Common pitfall: if `data.posthogConversions` is typed as possibly undefined, add a null check around the card: `{data.posthogConversions && (...)}`

- [ ] **Step 6: Check in the browser**

Open `http://localhost:3000/dashboard/analytics`. In the "Review Funnel" tab, verify:
1. The 4 KPI cards (Sent, Opened, Clicked platform, Completed) each show an ⓘ dot on hover for Opened/Clicked/Completed
2. The emerald PostHog conversions card appears below the existing "Sent → Completed" bar
3. Platform breakdown shows only platforms with count > 0 (Google always shown)
4. Hovering the ⓘ in the PostHog card shows the tooltip text

- [ ] **Step 7: Commit**

```bash
git add pages/dashboard/analytics.tsx
git commit -m "feat(analytics): add InfoDot tooltips and PostHog conversions card to analytics page"
```
