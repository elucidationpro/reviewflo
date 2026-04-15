# Client Conversion Metrics — Design Spec
**Date:** 2026-04-15  
**Status:** Approved

## Problem

Clients have no visibility into their PostHog-sourced conversion metrics. The admin analytics dashboard already surfaces PostHog's `platform_selected` unique-person counts per business (the most accurate signal we have), but clients only see raw review counts and avg rating on their dashboard. The analytics sub-page shows funnel rates, but those are sourced from the database, not PostHog.

## Goal

Surface PostHog-accurate conversion percentage to all clients (all tiers) in two places:
- **`/dashboard`** — a single clean number in the existing Quick Stats card
- **`/dashboard/analytics`** — a richer breakdown with info tooltips explaining each metric

## Approach

Extend the existing `GET /api/analytics/dashboard-data` endpoint to include per-business PostHog conversion data, fetched in parallel with existing DB queries. Both client pages consume from this single endpoint. Graceful fallback to DB rates if PostHog is unavailable.

---

## Data Layer

### New function: `fetchPosthogConversionsForBusiness`

**File:** `lib/posthog-conversions-query.ts`

Add an exported function alongside the existing `fetchPosthogPlatformConversions` (which queries all businesses for admin):

```ts
fetchPosthogConversionsForBusiness(
  businessId: string,
  startIso: string
): Promise<{ uniquePersons: number; platformBreakdown: PlatformBreakdown } | null>
```

Runs two HogQL queries (same structure as the admin queries) filtered to a single `businessId`:
1. `uniqExact(person_id)` where `event = 'platform_selected'` and `properties.businessId = businessId`
2. Breakdown by `properties.platform`

Returns `null` if PostHog env vars are missing or the request fails.

### API response extension

**File:** `pages/api/analytics/dashboard-data.ts`

Call `fetchPosthogConversionsForBusiness` in parallel with existing DB queries. Add to the assembled response:

```json
"posthogConversions": {
  "conversionRate": 68,
  "uniquePersons": 42,
  "platformBreakdown": { "google": 35, "facebook": 5, "yelp": 2, "nextdoor": 0 },
  "source": "posthog"
}
```

**`conversionRate` formula:** `round(uniquePersons / funnel.sent * 100)`  
- If `funnel.sent === 0`, `conversionRate = 0`  
- If PostHog returns `null`, fall back to `funnel.completionRate` with `source: "database"`

**TypeScript type** added to response shape:

```ts
interface PosthogConversions {
  conversionRate: number
  uniquePersons: number
  platformBreakdown: { google: number; facebook: number; yelp: number; nextdoor: number }
  source: 'posthog' | 'database'
}
```

---

## UI: Main Dashboard (`/dashboard`)

**File:** `pages/dashboard.tsx`

### Changes

1. **Fetch conversion data:** On mount, call `GET /api/analytics/dashboard-data?days=30` (same endpoint the analytics page uses). Store `posthogConversions` in local state.

2. **Display:** Add a third row to the existing "Quick Stats" card, matching the `p-3 bg-gray-50 rounded-xl` style of the existing Avg Rating and Pending Feedback rows:

```
┌─────────────────────────────┐
│ Conversion Rate             │
│ 68%                         │
└─────────────────────────────┘
```

- Value: `conversionRate + '%'`, or `'—'` if `funnel.sent === 0` or data hasn't loaded
- Label below value: `"clicked a review platform"` (small, gray)
- No tooltip on this page — keep it simple
- No tier gate — visible to all tiers

### State additions

```ts
const [conversionData, setConversionData] = useState<PosthogConversions | null>(null)
const [conversionLoading, setConversionLoading] = useState(false)
```

Fetch runs after business is loaded, in a separate `useEffect`. Failures are silent (value stays `—`).

---

## UI: Analytics Sub-page (`/dashboard/analytics`)

**File:** `pages/dashboard/analytics.tsx`

### Info Tooltip Component

Inline `InfoDot` component (defined at top of file, no new file needed):

```tsx
function InfoDot({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex items-center ml-1 cursor-help">
      <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span className="invisible group-hover/tip:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg z-10">
        {text}
      </span>
    </span>
  )
}
```

Pure CSS hover — no JS, no library.

### Existing funnel stat cards — add info dots

Each rate card's label gets an `<InfoDot>` appended:

| Metric | Tooltip text |
|---|---|
| Open Rate | "% of review requests that were opened by the recipient" |
| Click Rate | "% of openers who tapped through to your rating page" |
| Completion Rate | "% of sent requests where the customer completed the flow in our system" |

### New PostHog Conversions card

Added below (or replacing) the completion rate card — visually distinguished with a subtle accent:

```
┌──────────────────────────────────────────────────┐
│ Platform Conversions  ⓘ                          │
│ 68%                                              │
│ 42 unique customers                              │
│                                                  │
│ Google ████████████ 35                           │
│ Facebook ███ 5                                   │
│ Yelp ██ 2                                        │
│ Nextdoor — 0                                     │
└──────────────────────────────────────────────────┘
```

Tooltip: *"Unique customers who clicked Google, Facebook, or another review platform — tracked directly by PostHog for the most accurate count."*

Platform breakdown rendered as small labeled rows (platform name + count). Only shown if count > 0, except Google which always shows.

If `source === 'database'`, a small note renders below: *"Using system data — PostHog not available"* in gray italic.

### Data flow changes

The analytics page already calls `dashboard-data.ts`. It gains `posthogConversions` from the response with no additional fetch needed. The existing `DashboardData` interface gains `posthogConversions: PosthogConversions`.

---

## Error Handling & Edge Cases

| Scenario | Behavior |
|---|---|
| PostHog env vars missing | Falls back to `source: 'database'`, uses `funnel.completionRate` |
| PostHog request times out / errors | Same fallback, no UI error shown |
| No review requests sent yet | `conversionRate: 0`, displayed as `—` in dashboard, `0%` in analytics |
| `funnel.sent === 0` | `conversionRate: 0` regardless of PostHog response |
| Business brand new (no data) | All values `0` / `—`, no broken states |

---

## Files Changed

| File | Change |
|---|---|
| `lib/posthog-conversions-query.ts` | Add `fetchPosthogConversionsForBusiness` |
| `pages/api/analytics/dashboard-data.ts` | Call new function in parallel, extend response |
| `pages/dashboard.tsx` | Fetch conversion data, add 3rd Quick Stats row |
| `pages/dashboard/analytics.tsx` | Add `InfoDot` component, add info dots to existing cards, add PostHog conversions card |

No new API endpoints. No new npm packages. No schema changes.
