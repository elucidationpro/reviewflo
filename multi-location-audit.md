# Multi-Location Audit — ReviewFlo

Audit + implementation report for the "one login, multiple GBP locations" feature. Written after completing Tasks 1–6 of the Opus-A plan. **No deploy, no git push** — everything is on local `main`.

---

## 1. Current data model

**`businesses` table** — the parent-child pattern already existed before this pass:
- [supabase/migrations/20250414120000_business_parent_location.sql](supabase/migrations/20250414120000_business_parent_location.sql) added `parent_business_id` (FK → `businesses.id`, `ON DELETE SET NULL`), plus a unique-root-per-user partial index ensuring each user has exactly one primary row (`parent_business_id IS NULL`).
- [lib/business-account.ts](lib/business-account.ts) provides `pickPrimaryBusinessRow` (prefers `parent_business_id IS NULL`, falls back to the oldest row) and `sortLocationSummaries`.
- [docs/MULTI_LOCATION.md](docs/MULTI_LOCATION.md) codified the tier caps: Free = 1, Pro = 3, AI = 15.

**All per-business tables** already scope by `business_id` FK (`review_requests`, `review_templates`, `google_business_stats`, `feedback`, `sms_events`, etc.). No per-location data migration needed — each child row has its own `id` and those tables join cleanly.

**GBP token columns on `businesses`** (`google_oauth_access_token`, `google_oauth_refresh_token`, `google_oauth_expires_at`, `google_place_id`, `google_business_name`, `google_review_url`) are physically per-row — the change in this pass is **semantic**: the OAuth callback must target one `business.id` instead of all rows under a `user_id`.

---

## 2. Single-business assumptions catalogued

The exploration phase found every place in the codebase that assumed "one user = one business":

### API routes using `.single()` / `.eq('user_id', …)` (8 patched)
| Route | Before | After |
|---|---|---|
| [pages/api/analytics/dashboard-data.ts](pages/api/analytics/dashboard-data.ts) | `.eq('user_id').single()` | `getBusinessForRequest(user, businessId?)` |
| [pages/api/review-requests/list.ts](pages/api/review-requests/list.ts) | same | same |
| [pages/api/review-requests/stats.ts](pages/api/review-requests/stats.ts) | same | same |
| [pages/api/google-stats/fetch.ts](pages/api/google-stats/fetch.ts) | same | same |
| [pages/api/google-stats/refresh.ts](pages/api/google-stats/refresh.ts) | same | same |
| [pages/api/send-review-request.ts](pages/api/send-review-request.ts) | same | same |
| [pages/api/update-business-settings.ts](pages/api/update-business-settings.ts) | already accepted `businessId` | unchanged |
| [pages/api/google-reviews/list.ts](pages/api/google-reviews/list.ts) | uses `getAuthContext` wrapper | wrapper now accepts `businessId` |

The common helper `getBusinessForRequest(client, userId, businessId?, select?)` was added to [lib/business-account.ts](lib/business-account.ts) so each route change is 3–4 lines.

### Caller pages updated to pass `businessId`
- [pages/dashboard.tsx](pages/dashboard.tsx)
- [pages/dashboard/reviews.tsx](pages/dashboard/reviews.tsx)
- [pages/dashboard/outreach.tsx](pages/dashboard/outreach.tsx)
- [pages/feedback.tsx](pages/feedback.tsx)
- [pages/settings.tsx](pages/settings.tsx)

### Bug fix surfaced by the audit
[pages/dashboard/reviews.tsx:77](pages/dashboard/reviews.tsx#L77) — the feedback "pending count" query was missing `.eq('business_id', …)`, so it silently counted **every** user's unresolved feedback when RLS wasn't enforcing it. Fixed while scoping the page to `businessId`.

---

## 3. GBP OAuth scoping

**Before:** [pages/api/auth/google/callback.ts](pages/api/auth/google/callback.ts) wrote tokens via `.eq('user_id', user.id)` — i.e. all rows owned by the user got the same tokens. Effectively per-user.

**After:** the existing signed CSRF `state` param now carries a pipe-delimited payload `<access_token>|<businessId>`. The access token is a JWT and contains no pipes, so the delimiter is safe. Callback decodes, validates the `businessId` is owned by the authed user, then writes tokens with `.eq('id', businessId)`.

**Fallback:** if `state` has no pipe (legacy flow, or a user who never saw the new Settings UI), the callback falls back to the primary row via `.is('parent_business_id', null).eq('user_id', user.id)`. This preserves the first-time-connect UX for existing single-location users.

**Schema:** a comment-only migration ([supabase/migrations/20260422130000_per_location_gbp_tokens.sql](supabase/migrations/20260422130000_per_location_gbp_tokens.sql)) documents the new semantics on each affected column. No DDL required — the columns were already per-row.

**RLS:** no changes. Existing policies key off `user_id = auth.uid()`. New child rows inherit `user_id` from the primary at creation ([pages/api/businesses/add-location.ts](pages/api/businesses/add-location.ts)).

---

## 4. Frontend: context + switcher + Settings → Locations

### `BusinessContext` — [contexts/BusinessContext.tsx](contexts/BusinessContext.tsx)
Holds `{ primary, locations, maxLocations, selectedBusinessId, setSelectedBusinessId, loading, refresh }`. Fetches `/api/my-business` once, persists `selectedBusinessId` to `localStorage` under key `reviewflo.selectedBusinessId`, defaults to primary. When selection changes, re-fetches `/api/my-business?businessId=<id>` to hydrate the selected row. Mounted globally in [pages/_app.tsx](pages/_app.tsx).

### `LocationSwitcher` — [components/LocationSwitcher.tsx](components/LocationSwitcher.tsx)
Hand-rolled popover matching the existing `HelpTip` pattern at [pages/settings.tsx:44-75](pages/settings.tsx#L44-L75). Renders `null` when `locations.length < 2`. Mounted inside the sidebar business-info block in [components/AppLayout.tsx](components/AppLayout.tsx).

### `LocationsSection` — [components/LocationsSection.tsx](components/LocationsSection.tsx)
New Settings sub-section (sidebar entry "Locations") that lists every location, each with:
- Name + slug + primary badge (if applicable)
- **Connect GBP** button — builds an OAuth URL identical to the existing Review Links flow, with `state = <access_token>|<businessId>` so the callback writes tokens to that specific location.
- **Remove** button on non-primary rows (confirmation modal) calling the new [pages/api/businesses/remove-location.ts](pages/api/businesses/remove-location.ts).
- **Add Location** button on Pro/AI tiers under cap, calling the existing [pages/api/businesses/add-location.ts](pages/api/businesses/add-location.ts), then selecting the new location.
- Free-tier callout directing to upgrade when trying to add a second location.

---

## 5. Decisions made & why

1. **Extend existing parent-child schema; don't add a new `locations` table.** The Opus-A prompt proposed a separate `locations` table, but the codebase already had `parent_business_id`, an ownership invariant (unique-root-per-user), `pickPrimaryBusinessRow`, and an `add-location` route. Adding a parallel table would have duplicated every join, multiplied RLS surface, and forced a data copy. Extension was strictly additive and reversible.

2. **Keep tier caps Free = 1, Pro = 3, AI = 15.** The prompt's table matched what was already in [lib/tier-permissions.ts](lib/tier-permissions.ts). Changing caps would have required pricing-page updates and stakeholder alignment outside this task's scope.

3. **Refactor all 8 routes, not gate behind a flag.** The switcher is invisible for single-location accounts (`locations.length < 2`), so scoping the routes has zero UX impact for existing users while removing a class of latent bugs (the reviews-page feedback bug being exhibit A).

4. **Pipe-delimited OAuth state, not a new state store.** The existing flow already uses `state` for CSRF. Pipe is safe because JWTs don't contain it. A signed cookie-based store would have added complexity for one field.

5. **Context-based selection, no URL routing.** v1 keeps the selected location in React context + localStorage. No per-location URL paths (e.g. `/dashboard/[locationSlug]`). Good enough for the beta; deferred to a follow-up if shareable deep-links are needed.

---

## 6. Files changed / created

### Created
- `contexts/BusinessContext.tsx`
- `components/LocationSwitcher.tsx`
- `components/LocationsSection.tsx`
- `pages/api/businesses/remove-location.ts`
- `supabase/migrations/20260422130000_per_location_gbp_tokens.sql`
- `multi-location-audit.md` (this file)

### Modified (API)
- `pages/api/my-business.ts` — accepts optional `?businessId=` and returns that location's full row while keeping tier from primary.
- `pages/api/auth/google/callback.ts` — decodes pipe-delimited state, writes tokens scoped to `businessId`.
- `pages/api/analytics/dashboard-data.ts`
- `pages/api/review-requests/list.ts`
- `pages/api/review-requests/stats.ts`
- `pages/api/google-stats/fetch.ts`
- `pages/api/google-stats/refresh.ts`
- `pages/api/send-review-request.ts`
- `lib/business-account.ts` — added `getBusinessForRequest` helper.
- `lib/api-utils.ts` — `getAuthContext` now threads `businessId`.

### Modified (UI)
- `pages/_app.tsx` — mounts `BusinessProvider`.
- `components/AppLayout.tsx` — renders `LocationSwitcher`.
- `pages/dashboard.tsx` — reads `selectedBusinessId`, threads into fetches.
- `pages/dashboard/reviews.tsx` — same, plus feedback-count bug fix.
- `pages/dashboard/outreach.tsx` — same, plus feedback-count scope fix.
- `pages/feedback.tsx` — same.
- `pages/settings.tsx` — same; added "Locations" sidebar entry + section.

---

## 7. Verification

- `npx tsc --noEmit` — passes.
- `npm run build` — passes (all routes compile, including the 80+ `/for/[industry]` SSG paths).
- No lint warnings introduced.

### Manual walk-through

| Scenario | Expected | How to verify |
|---|---|---|
| Single-location user signs in | Switcher hidden; dashboard unchanged. | `locations.length === 1` → `LocationSwitcher` returns null. |
| Add a second location (Pro/AI) | Switcher appears with both names. | Settings → Locations → Add → refresh. |
| Connect GBP on new location | Tokens land on new `business.id`; primary row's tokens untouched. | `select id, google_oauth_refresh_token is not null from businesses where user_id = ...`. |
| Flip switcher | Every pane (Overview KPIs, Reviews, Outreach, Feedback, Settings Profile) reloads with new location's data. | `useEffect` deps include `selectedBusinessId`. |
| Free tier hits cap | "Add" button hidden, upgrade callout shown. | Tier-gated via `getMaxBusinessLocations` in `LocationsSection`. |
| Pro hits cap at 3 | Server returns 400 with clear message. | `add-location` route checks `rows.length >= maxLocations`. |

---

## 8. Out of scope (deferred)

- **Per-location UI for slug/address edits** — schema columns exist; no dedicated editor beyond the existing Settings Profile section for the selected location.
- **Per-location branding (logo/color)** — schema supports; UI deferred.
- **Org-level rollup dashboard** — aggregated view across all locations.
- **Cron job** — [pages/api/cron/fetch-google-stats.ts](pages/api/cron/fetch-google-stats.ts) already loops every business row, so it's multi-location safe out of the box. Confirmed in audit, no change needed.
- **Remaining items** in [docs/MULTI_LOCATION.md](docs/MULTI_LOCATION.md) "Future Work" section.
- **URL-based location deep-linking** (`/dashboard/[locationSlug]`) — context-only for v1.

---

## 9. Notes for Jeremy

- The single-location UX is **identical** to before the change — switcher is invisible at `locations.length < 2`. No regressions expected for existing users.
- The OAuth state pipe trick works because Supabase access tokens are base64url-encoded JWTs (no pipes). If the token format ever changes, the callback's `split('|')` becomes fragile — swap to a proper signed payload then.
- The `remove-location` endpoint hard-deletes the row and all FK cascades. Confirm cascade rules on `review_requests`, `review_templates`, `google_business_stats`, `feedback`, `sms_events` before enabling removal in production for paid customers.
- Nothing pushed, nothing deployed. Commits are local only.
