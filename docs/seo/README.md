# Google indexing audit and fixes for usereviewflo.com

Branch: `codex/google-indexing-fixes` · Base: `main@a1a736d` · No production deploy performed as part of this branch.

## Contents

- [What we found](#what-we-found)
- [What was changed in code](#what-was-changed-in-code)
- [Verification](#verification)
- [Google Search Console evidence](#google-search-console-evidence)
- [Manual actions after this PR merges](#manual-actions-after-this-pr-merges)
- [What is explicitly out of scope](#what-is-explicitly-out-of-scope)
- [Files in this directory](#files-in-this-directory)

## What we found

Diagnosis was performed **before** any code was changed. The captured baseline lives at [`production-before.json`](./production-before.json) (a full crawl of every sitemap URL on production the day the branch was cut) and [`production-redirects.json`](./production-redirects.json) (hop-by-hop redirect chains from HTTP/HTTPS × apex/www × marketing aliases). Findings:

1. **Duplicate / conflicting canonicals on nearly every public page.** `pages/_app.tsx` was emitting a `<link rel="canonical" href="https://www.usereviewflo.com/…">` for the current pathname while individual homepage, features, pricing, blog and industry templates each also emitted their own `<link rel="canonical">`, sometimes pointing at the apex host `https://usereviewflo.com/…`. Google saw two `rel=canonical` values per document, one of which was a redirected apex URL.
2. **Private routes were index,follow.** `pages/_document.tsx` set a global `<meta name="robots" content="index, follow">`. Individual page components tried to override this with `noindex, nofollow` for `dashboard/*`, `settings`, `admin/*`, `join/*`, `auth/*`, `feedback`, `update-password`, etc., but those overrides only rendered after `AccountRouteGuard` gated the component, so on the first paint (which is what Googlebot reads) private pages advertised `index, follow`.
3. **No `robots.txt` and no `X-Robots-Tag` header.** `/robots.txt` returned 404, and API routes had no header telling crawlers to keep them out of results.
4. **Sitemap had no `<lastmod>`.** All 93 URLs were emitted without dates, so Google could not tell fresh pages from stale ones.
5. **31 of 93 public pages were unreachable from the homepage via crawlable initial-HTML links.** The homepage promoted Plumbers, HVAC Pros, Mechanics and Landscapers as example use cases but linked those anchors to `#` or nowhere. `/for/*` industry pages had no discovery hub. Footer had no `/for` link.
6. **Redirect chains.** Marketing aliases (`/for-barbers`, `/for/lash-studios`, `/privacy`, `/pricing/`, `/for/plumbing-services/`) took 2 hops. Apex → www took 2 hops on HTTPS. HTTP apex → HTTPS www took 3 hops because Vercel forces HTTPS at the edge before the app can normalize the host.
7. **Wrong Open Graph / Twitter image host on all industry pages.** `components/IndustryLandingPage.tsx` referenced `https://reviewflo.com/...` (a domain the project does not own) for its OG/Twitter card images.

## What was changed in code

All changes are metadata-only. Auth, billing, database schema and review routing were **not** touched.

### Commit `d298695` — canonicals and private-page noindex

- Removed the per-page `<link rel="canonical">` from homepage / features / pricing / blog / privacy-policy / terms / industry template. The single source of truth is now `_app.tsx` (already emitting `https://www.usereviewflo.com{pathname}`).
- Removed the global `<meta name="robots" content="index, follow">` from `_document.tsx`. `_app.tsx` now conditionally emits `noindex, nofollow` for dashboard / settings / admin / auth / join / feedback / business-page routes **outside** `AccountRouteGuard`, so it renders on first paint.
- Normalized every industry JSON file's `canonicalPath` reference to the `www.usereviewflo.com` host.

### Commit `88dfdb1` — internal linking

- Added a `/for` directory hub page (`pages/for/index.tsx`) listing all 81 industries with real `<Link href="/for/{slug}">` anchors. Linked from the site footer.
- Fixed the homepage industry examples (Plumbers → `/for/plumbing-services`, HVAC Pros → `/for/hvac-repair`, Mechanics → `/for/auto-repair-shops`, Landscapers → `/for/lawn-care`) so those anchors point to real pages.
- Result: **0 of 95** sitemap URLs are unreachable from the homepage via initial-HTML links (was 31 of 93).

### Commit `f9d7a3f` — sitemap dates and crawl policy

- Added `scripts/update-seo-dates.mjs` which walks Git history for each source file that renders each URL and writes `data/seo-lastmod.json` with real ISO dates (blog dates are `max(source file date, publish schedule date)`). Sitemap now emits `<lastmod>` for every URL.
- Added `/for` and `/features` to the sitemap. Count is now 95 URLs (was 93; 81 industries + `/for` + `/features` + 5 posts + 7 fixed pages).
- Added a real `pages/robots.txt.tsx` that returns `User-agent: * / Allow: / / Disallow: /api/` plus a `Sitemap:` line pointing to `https://www.usereviewflo.com/sitemap.xml`. **Private HTML pages are intentionally NOT `Disallow`ed** — a `Disallow`ed URL cannot be fetched, so Google would never see its `noindex` meta and would potentially still index it based on inbound links. The right combination is "crawlable HTML + `noindex` meta".

### This PR (pending commits) — redirects, headers, OG host, dir nav

- `next.config.ts`: added `skipTrailingSlashRedirect: true` and generated an explicit `${source}/` companion redirect for every marketing alias (except the `/obsidianauto` business slug — see note below), followed by a generic `/:path+/ → /:path+` permanent redirect. This collapses previous 2-hop alias chains to a single 308.
- `next.config.ts`: added `{ source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }` so API JSON responses cannot appear in search results even if crawled directly.
- `components/IndustryLandingPage.tsx`: fixed OG and Twitter image hosts from `reviewflo.com` to `www.usereviewflo.com`. Also promoted the FAQ and SoftwareApplication JSON-LD `<Script>` tags from `strategy="afterInteractive"` to `strategy="beforeInteractive"` so they render in the initial HTML (matches the pattern already used by `pages/blog/[slug].tsx` for `Article` JSON-LD). Both JSON-LD types now appear in the crawler's first response for all 81 industry pages.
- `pages/for/index.tsx`: passed `variant="marketing"` to `SiteNav` (TypeScript required prop after nav variant split).

### Note on the `/obsidianauto` → `/obsidian-auto` redirect

This is an existing Kova Wash business alias. Because the "review routing logic" is out of scope, we did not add a `/obsidianauto/` explicit entry into the alias flatMap. In practice the generic `/:path+/ → /:path+` rule catches `/obsidianauto/` first, and empirically both `/obsidianauto` and `/obsidianauto/` settle on `/obsidian-auto` in a single 308 hop on the local production server (see [`local-redirects.json`](./local-redirects.json)).

## Verification

Every check runs against the local production build (`npm run build` with default Turbopack, then `npm run start -- --port 3107`). **No production deploy was performed.**

### Local audit script

[`scripts/audit-indexing.py`](../../scripts/audit-indexing.py) fetches only initial HTML (never executes JavaScript). Against `http://localhost:3107` it:

- fetches `/sitemap.xml`, requests every URL, and asserts each is a direct `200` (no redirect chain)
- asserts each URL has exactly one `<link rel="canonical">` matching the sitemap URL
- asserts each URL has one `<meta property="og:url">` matching the sitemap URL
- asserts no public page carries `noindex` in `<meta name="robots">` or the `X-Robots-Tag` response header
- asserts no `<script type="application/ld+json">` body contains the apex host `https://usereviewflo.com`
- asserts no `<a href>` in the initial HTML points at the apex host
- asserts every page has an `<h1>` and at least 50 words of text outside `<script>`/`<style>`
- asserts every sitemap entry has a non-null, non-future `<lastmod>`
- walks the reachability graph from `/` through only initial-HTML anchors and reports any sitemap URL not reachable
- probes `/robots.txt` (must be 200 and reference the canonical sitemap URL), a batch of known-404 URLs (`/seo-audit-missing-…`, `/blog/seo-audit-missing-…`, `/for/seo-audit-missing-…`) to prove unknown paths return real 404s, and a batch of private routes (`/dashboard`, `/settings`, `/admin`, `/join/callback`, `/reset-password`, `/update-password`, `/auth/magic-landing`, `/obsidian-auto`, `/obsidian-auto/feedback`, `/obsidian-auto/templates`) to prove they return 200 with `noindex` in the initial HTML
- probes `/privacy`, `/privacy/`, `/pricing/`, `/for-barbers`, `/for-barbers/` to prove each is a **single** permanent redirect

Full JSON output: [`local-after.json`](./local-after.json). Summary of the latest strict run:

```
sitemap_count: 95
errors:        0
unreachable:   0
```

### Local redirect hops

Captured with a Python `HTTPRedirectHandler` that never follows Location — every value below is what the server itself returned to the first request. Full data: [`local-redirects.json`](./local-redirects.json).

| Request path | Hops | Final |
|---|---|---|
| `/for/lash-studios`   | 1 (308) | `/for/eyebrow-lash-studios` |
| `/for/lash-studios/`  | 1 (308) | `/for/eyebrow-lash-studios` |
| `/for-barbers`        | 1 (308) | `/for/barber-shops` |
| `/for-barbers/`       | 1 (308) | `/for/barber-shops` |
| `/privacy`            | 1 (308) | `/privacy-policy` |
| `/privacy/`           | 1 (308) | `/privacy-policy` |
| `/pricing/`           | 1 (308) | `/pricing` |
| `/obsidianauto`       | 1 (308) | `/obsidian-auto` |
| `/obsidianauto/`      | 1 (308) | `/obsidian-auto` |

### Response headers (local build)

`curl -sI http://localhost:3107/api/hello`

```
X-Robots-Tag: noindex, nofollow
Content-Type: application/json; charset=utf-8
```

`curl -sI http://localhost:3107/dashboard` returns `200` and the initial HTML contains `<meta name="robots" content="noindex, nofollow">`.

`curl -s http://localhost:3107/robots.txt`

```
User-agent: *
Allow: /
Disallow: /api/

# Private HTML routes (dashboard, admin, auth, join, business pages) must
# remain crawlable so crawlers can read their noindex metadata.
Sitemap: https://www.usereviewflo.com/sitemap.xml
```

### Lint

```
npx eslint components/IndustryLandingPage.tsx next.config.ts pages/for/index.tsx
```

Two warnings on `components/IndustryLandingPage.tsx` (`@next/next/no-before-interactive-script-outside-document`). This is a **pre-existing project pattern** — `pages/blog/[slug].tsx` already uses `beforeInteractive` on the `Article` JSON-LD `<Script>` and triggers the same warning. The pattern is intentional here because it puts the JSON-LD in initial HTML, which is exactly what we want for indexing. Zero errors.

## Google Search Console evidence

Full per-URL after-fix mapping: [`gsc-discovered-mapping.json`](./gsc-discovered-mapping.json). Raw GSC export: [`gsc-discovered.csv`](./gsc-discovered.csv).

### "Discovered — currently not indexed" (75 URLs, exported 2026-09-28)

All 75 URLs are the `www` canonical form. All 75 are in the current sitemap and every one now serves a direct `200` with a matching canonical, matching `og:url`, an `<h1>`, a non-null `<lastmod>`, and (for `/for/*` and `/blog/*`) JSON-LD in initial HTML.

Breakdown by URL family:

| Family | Count | Example |
|---|---|---|
| `/for/{industry}` | 66 | `/for/plumbing-services` |
| `/blog/{slug}` and `/blog` | 6 | `/blog/how-to-get-more-google-reviews` |
| Fixed marketing | 3 | `/demo`, `/pricing`, `/privacy-policy` |

The 1969-12-31 timestamps in the CSV are Search Console's "no crawl on record" sentinel, not a real date. Every URL was in the sitemap on the crawl day of the export, so the "Discovered" state reflects that Google found the URL from the sitemap but chose not to crawl it. The technical deficiencies that likely deprioritized crawl (duplicate canonicals, no `lastmod`, unreachable from homepage, apex JSON-LD host) are all now resolved. **Whether Google chooses to index a given industry landing page after recrawl depends on Google's per-page usefulness assessment, which we cannot promise.** Templated industry pages differ only in copy blocks between slugs; if a subset is still excluded after the recrawl cycle, the next lever is per-page differentiation (unique testimonials, unique CTAs, unique FAQ answers), not additional technical fixes.

### "Page with redirect" (9 URLs from the provided screenshot)

Google is treating each of these as an alternate URL for the corresponding canonical. That is the correct outcome; the goal is not to index the alternate but to make it a **single** permanent hop to the canonical so signals consolidate.

| URL as reported | After-fix hops locally | Canonical destination |
|---|---|---|
| `http://usereviewflo.com/` | 3 (Vercel edge forces HTTPS, then apex→www, then app 200) | `https://www.usereviewflo.com/` |
| `https://usereviewflo.com/` | 1 (307, Vercel edge)* | `https://www.usereviewflo.com/` |
| `http://www.usereviewflo.com/` | 2 (Vercel edge forces HTTPS, then 200) | `https://www.usereviewflo.com/` |
| `https://usereviewflo.com/for/house-cleaning` | 1 (307, Vercel edge) | `https://www.usereviewflo.com/for/house-cleaning` |
| `https://usereviewflo.com/for/mobile-auto-detailing` | 1 (307, Vercel edge) | `https://www.usereviewflo.com/for/mobile-auto-detailing` |
| `https://usereviewflo.com/for/painting-contractors` | 1 (307, Vercel edge) | `https://www.usereviewflo.com/for/painting-contractors` |
| `https://usereviewflo.com/for/veterinary-clinics` | 1 (307, Vercel edge) | `https://www.usereviewflo.com/for/veterinary-clinics` |
| `https://usereviewflo.com/for/law-offices` | 1 (307, Vercel edge) | `https://www.usereviewflo.com/for/law-offices` |
| `https://usereviewflo.com/for/permanent-makeup` | 1 (307, Vercel edge) | `https://www.usereviewflo.com/for/permanent-makeup` |

*Currently the apex → www edge redirect returns HTTP `307` (temporary). Google will not consolidate signals through a `307`. This must be changed to `308` in the Vercel Dashboard — see **Manual actions** below. HTTP-apex will always take 2 hops through Vercel's edge (HTTPS upgrade, then apex→www) and there is no supported configuration to collapse it into one; that is a platform limitation.

### "Crawled — currently not indexed" (13 URLs total, 10 shown in the screenshot)

10 URLs shown in the screenshot supplied by the user. The remaining 3 URLs in this bucket were not visible in the screenshot and were not exported to CSV; **we do not know which 3 they are** without additional GSC access.

Every screenshotted URL is either the canonical `www` form or the apex alternate:

| URL | Host | After-fix status locally |
|---|---|---|
| `https://www.usereviewflo.com/for/painting-contractors` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD |
| `https://www.usereviewflo.com/for/home-inspection-services` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD |
| `https://usereviewflo.com/for/hvac-repair` | apex | 1-hop 307 → www destination (canonical 200 verified) |
| `https://www.usereviewflo.com/for/hvac-repair` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD |
| `https://www.usereviewflo.com/for/permanent-makeup` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD |
| `https://www.usereviewflo.com/for/vacation-rentals` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD |
| `https://usereviewflo.com/for/fence-installation` | apex | 1-hop 307 → www destination (canonical 200 verified) |
| `https://www.usereviewflo.com/for/fence-installation` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD |
| `https://usereviewflo.com/for/physical-therapy` | apex | 1-hop 307 → www destination (canonical 200 verified) |
| `https://www.usereviewflo.com/for/physical-therapy` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD |

Same caveat as above: technical signals are now clean; unique content per template is the next lever if exclusion persists.

## Manual actions after this PR merges

These changes require human access to Vercel, Supabase, Stripe and Search Console. They are safe, but out of scope for a code PR.

### 1. Vercel — change apex→www to permanent (308)

1. Vercel Dashboard → **reviewflo** project → **Settings → Domains**.
2. Locate `usereviewflo.com` (currently marked "Redirect to www.usereviewflo.com").
3. Edit the redirect and change the status code from **Temporary (307)** to **Permanent (308)**.
4. Save.
5. Verify with `curl -sI https://usereviewflo.com/`. Expected: `HTTP/2 308` with `Location: https://www.usereviewflo.com/`.
6. Verify there is no reverse loop: `curl -sI https://www.usereviewflo.com/` should return `200`, not `308`.
7. Note the platform limitations already documented above: HTTP-apex will still take 2 hops (HTTPS upgrade + host normalize) because Vercel forces HTTPS at the edge before its custom-domain redirect runs. There is no supported "single hop from `http://usereviewflo.com/` to `https://www.usereviewflo.com/`" configuration; this is not a bug in our config.

### 2. Vercel — verify environment (read only, do NOT print secrets)

Confirm `NEXT_PUBLIC_APP_URL` for **Production** is `https://www.usereviewflo.com`. Verified via Vercel API on 2026-09-28. No change needed. If preview/development ever gets set to the apex, change it back — apex would inject the wrong host into email links generated by `lib/auth-link-utils.ts`, `pages/api/send-password-reset.ts` and `pages/api/send-magic-link.ts` when `req.headers.origin` is absent.

### 3. Supabase — Site URL and redirect allow list

Dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://www.usereviewflo.com`
- **Redirect URLs allow list** must include (retain any dev/localhost entries you rely on):
  - `https://www.usereviewflo.com/auth/magic-landing`
  - `https://www.usereviewflo.com/auth/magic-landing?next=dashboard`
  - `https://www.usereviewflo.com/auth/magic-landing?next=admin`
  - `https://www.usereviewflo.com/auth/magic-landing?next=google-confirm`
  - `https://www.usereviewflo.com/join/callback`
  - `https://www.usereviewflo.com/early-access/join`
  - `https://www.usereviewflo.com/update-password`
- Do **not** delete existing entries you already depend on for other environments. **We did not change any auth code**, so any existing allow-list entries that currently work will continue to work.
- Known code-side apex fallback: `pages/early-access/confirm-email.tsx` hard-codes `https://usereviewflo.com` in its redirect. If you want that path to reach `www` directly, that is an auth-adjacent code change and is out of scope for this PR; the Vercel apex→www 308 above will still route the browser correctly on that hop.

### 4. Stripe — no dashboard changes required, but be aware

Checkout success/cancel URLs are built per session by `pages/api/create-checkout-session.ts` and `pages/api/create-early-access-checkout.ts` using `req.headers.origin` → `NEXT_PUBLIC_APP_URL` → apex fallback. Because production `NEXT_PUBLIC_APP_URL` is already `www`, no dashboard change is required. **No test payment was triggered.** If you use standalone Stripe Payment Links or the Customer Portal branding page, verify the URLs in those (out of scope for this PR since they are not created from code in this repo).

### 5. Google Search Console — after production deploy

After merging and deploying:

1. Confirm `https://www.usereviewflo.com/robots.txt` returns 200 with the exact body shown above.
2. Confirm `https://www.usereviewflo.com/sitemap.xml` returns 200 with 95 `<url>` entries, each with `<lastmod>`.
3. Confirm `curl -sI https://www.usereviewflo.com/api/hello` includes `X-Robots-Tag: noindex, nofollow`.
4. **URL Inspection** on the canonical URLs first (do NOT inspect apex alternates — those are supposed to redirect):
   - `https://www.usereviewflo.com/`
   - `https://www.usereviewflo.com/pricing`
   - `https://www.usereviewflo.com/demo`
   - `https://www.usereviewflo.com/features`
   - `https://www.usereviewflo.com/for`
   - `https://www.usereviewflo.com/blog`
   - The 5 blog post URLs
   - A representative subset of `/for/{industry}` URLs from the Discovered-not-indexed list (e.g. `plumbing-services`, `hvac-repair`, `painting-contractors`, `physical-therapy`, `fence-installation`)
5. For each, click **Test live URL**, verify Google reads a single canonical (`https://www.usereviewflo.com/…`) and `Indexing allowed: Yes`, then click **Request indexing** for the priority pages only. Do not spam requests across all 66 industry URLs.
6. **Resubmit the sitemap** at Search Console → Sitemaps → enter `sitemap.xml` and click Submit. This forces a fresh discovery pass.
7. **Do not request indexing on alternate (apex) URLs.** Those are expected to be excluded as "Alternate page with proper canonical tag" once the 308 is in place.
8. Watch the **Page with redirect**, **Duplicate without user-selected canonical** and **Alternate page with proper canonical** categories over the next 2–4 weeks. The redirect category count should shrink as Google reprocesses the apex versions. Validate only the categories whose root cause we actually fixed.

### 6. What we did **not** do

- No production deploy.
- No sitemap submitted through Search Console.
- No indexing requests submitted.
- No email sent (magic link, password reset, or marketing).
- No dashboard toggles changed in Supabase, Stripe or Vercel.
- No `git push --force`, no branch deletion, no PR merged.
- No secrets read into logs or files.

## What is explicitly out of scope

- **`/compare/*` pages.** There are no `/compare` routes in this codebase, no linked reference to them, and none in the sitemap. The competitor comparison content would be net-new marketing pages and is a product decision, not a technical fix.
- Auth email link generation fallbacks (`lib/auth-link-utils.ts`, `pages/api/send-password-reset.ts`, `pages/api/send-magic-link.ts`, `pages/early-access/confirm-email.tsx`). These use `req.headers.origin` → `NEXT_PUBLIC_APP_URL` → an apex string as final fallback. In normal production traffic the request already arrives on `www`, so the fallback never fires; changing it would touch auth logic.
- Stripe standalone Payment Links / Customer Portal branding URLs (if any exist in the Stripe Dashboard).
- Per-page copy differentiation for the 81 industry landing pages. Templated pages that differ only by industry name are Google's most common "Discovered / Crawled — currently not indexed" pattern once technical signals are clean.

## Files in this directory

| File | What it is |
|---|---|
| [`README.md`](./README.md) | This document. |
| [`production-before.json`](./production-before.json) | Full pre-fix crawl of production. 93 URLs, with per-URL canonical / robots / og:url / redirect chain / initial HTML word count. Baseline evidence. |
| [`production-redirects.json`](./production-redirects.json) | Hop-by-hop chains for HTTP/HTTPS × apex/www / marketing alias combinations on production, pre-fix. |
| [`local-after.json`](./local-after.json) | Full post-fix crawl against `http://localhost:3107` (production build). 95 URLs, 0 errors, 0 unreachable. Contains `sitemap`, `probes`, `errors`, `unreachable` arrays plus per-URL JSON-LD types and text stats. |
| [`local-redirects.json`](./local-redirects.json) | Post-fix hop-by-hop chains for the 9 alias/trailing-slash paths, proving each takes exactly one 308 to canonical. |
| [`gsc-discovered.csv`](./gsc-discovered.csv) | Raw Search Console export of the 75 "Discovered — currently not indexed" URLs, dated 2026-09-28. |
| [`gsc-discovered-mapping.json`](./gsc-discovered-mapping.json) | Per-URL after-fix snapshot: `status`, `canonical_matches_url`, `og_matches_url`, `robots`, `h1_count`, `initial_html_words`, `lastmod`, `json_ld_types` for each of the 75 GSC URLs. |
