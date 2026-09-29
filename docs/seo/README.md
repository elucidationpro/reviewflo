# Google indexing audit and fixes for usereviewflo.com

Branch: `codex/google-indexing-fixes` · Base: `main@a1a736d` · **No production deploy performed as part of this branch. All post-fix evidence is from a local production build against `http://localhost:3107`.**

## Contents

- [What we found](#what-we-found)
- [What was changed in code](#what-was-changed-in-code)
- [Verification](#verification)
- [Google Search Console evidence](#google-search-console-evidence)
- [Manual actions after this PR merges](#manual-actions-after-this-pr-merges)
- [What is explicitly out of scope](#what-is-explicitly-out-of-scope)
- [Files in this directory](#files-in-this-directory)

## What we found

Diagnosis was performed **before** any code was changed. The captured baseline lives at [`production-before.json`](./production-before.json) (a full crawl of every sitemap URL on production the day the branch was cut) and [`production-redirects.json`](./production-redirects.json) (hop-by-hop redirect chains from HTTP/HTTPS × apex/www × marketing aliases). Findings, all observed on live production before any change:

1. **Duplicate / conflicting canonicals.** `pages/_app.tsx` was emitting a `<link rel="canonical" href="https://www.usereviewflo.com/…">` for the current pathname while individual homepage, features, pricing, blog and industry templates each also emitted their own `<link rel="canonical">`, sometimes pointing at the apex host `https://usereviewflo.com/…`. 72 of the 75 URLs Search Console flagged as "Discovered — currently not indexed" carried two `rel=canonical` values per document, one of which was the apex.
2. **Private routes were `index, follow` on first paint.** `pages/_document.tsx` set a global `<meta name="robots" content="index, follow">`. Individual page components tried to override this with `noindex, nofollow` for `dashboard/*`, `settings`, `admin/*`, `join/*`, `auth/*`, `feedback`, `update-password`, etc., but those overrides only rendered after `AccountRouteGuard` gated the component, so on the first paint (which is what Googlebot reads) private pages advertised `index, follow`.
3. **No `robots.txt` and no `X-Robots-Tag`.** `/robots.txt` returned 404, and API routes had no header telling crawlers to keep them out of results.
4. **Sitemap had no `<lastmod>`.** All 93 URLs were emitted without dates.
5. **31 of 93 public pages were unreachable from the homepage via crawlable initial-HTML links.** The homepage promoted Plumbers, HVAC Pros, Mechanics and Landscapers as example use cases but linked those anchors to `#` or nowhere. `/for/*` industry pages had no discovery hub. Footer had no `/for` link. 28 of the 75 GSC-reported URLs were in this unreachable set.
6. **Redirect chains.** Marketing aliases (`/for-barbers`, `/for/lash-studios`, `/privacy`, `/pricing/`, `/for/plumbing-services/`) took 2 hops. HTTPS apex → www took 2 hops (Vercel 307 to www, then app 200). HTTP apex → HTTPS www took 3 hops because Vercel forces HTTPS at the edge before any host-rewrite runs.
7. **Wrong Open Graph / Twitter image host on all industry pages.** `components/IndustryLandingPage.tsx` referenced `https://reviewflo.com/...` (a domain the project does not own).

These are the observed technical defects. We can measure them and we have fixed them. **What Google actually chose to do with each URL — whether "Discovered — currently not indexed" reflects duplicate canonicals, template similarity between industry pages, generalized crawl budget, or something else — is Google's private decision and cannot be inferred from the CSV export or the current sitemap state.**

## What was changed in code

All changes are metadata / config / crawl-policy only. Auth, billing, database schema and review routing were **not** touched.

### Commit `d298695` — canonicals and private-page noindex

- Removed the per-page `<link rel="canonical">` from homepage / features / pricing / blog / privacy-policy / terms / industry template. The single source of truth is now `_app.tsx` (already emitting `https://www.usereviewflo.com{pathname}`).
- Removed the global `<meta name="robots" content="index, follow">` from `_document.tsx`. `_app.tsx` now conditionally emits `noindex, nofollow` for dashboard / settings / admin / auth / join / feedback / business-page routes **outside** `AccountRouteGuard`, so it renders on first paint.
- Normalized every industry JSON file's `canonicalPath` reference to the `www.usereviewflo.com` host.

### Commit `88dfdb1` — internal linking

- Added a `/for` directory hub page (`pages/for/index.tsx`) listing all 81 industries with real `<Link href="/for/{slug}">` anchors. Linked from the site footer.
- Fixed the homepage industry examples (Plumbers → `/for/plumbing-services`, HVAC Pros → `/for/hvac-repair`, Mechanics → `/for/auto-repair-shops`, Landscapers → `/for/lawn-care`) so those anchors point to real pages.
- Result on the local production build: **0 of 95** sitemap URLs are unreachable from the homepage via initial-HTML links (was 31 of 93 on production before the change).

### Commit `f9d7a3f` — sitemap dates and crawl policy

- Added `scripts/update-seo-dates.mjs` which walks Git history for each source file that renders each URL and writes `data/seo-lastmod.json` with real ISO dates (blog dates are `max(source file date, publish schedule date)`). Sitemap now emits `<lastmod>` for every URL.
- Added `/for` and `/features` to the sitemap. Count is now 95 URLs (was 93; 81 industries + `/for` + `/features` + 5 posts + 7 fixed pages).
- Added a real `pages/robots.txt.tsx` that returns `User-agent: * / Allow: / / Disallow: /api/` plus a `Sitemap:` line pointing to `https://www.usereviewflo.com/sitemap.xml`. **Private HTML pages are intentionally NOT `Disallow`ed** — a `Disallow`ed URL cannot be fetched, so Google would never see its `noindex` meta and could still index it based on inbound links. The right combination is "crawlable HTML + `noindex` meta".

### Commit `5099420` (this PR) — redirects, headers

- `next.config.ts`: added `skipTrailingSlashRedirect: true` and generated an explicit `${source}/` companion redirect for every marketing alias (except the `/obsidianauto` business slug — see note below), followed by a generic `/:path+/ → /:path+` permanent redirect. On the local production build every tested alias with or without a trailing slash resolves in one 308.
- `next.config.ts`: added `{ source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }` so API JSON responses carry a crawler-directive even if fetched directly.

### Commits `ff4a8ce` and later (this PR) — industry image host and JSON-LD in initial HTML

- Fixed OG and Twitter image hosts in `components/IndustryLandingPage.tsx` from `reviewflo.com` to `www.usereviewflo.com`.
- Iteration: the first attempt at getting FAQ / SoftwareApplication JSON-LD into initial HTML moved the two `next/script` blocks from `strategy="afterInteractive"` to `strategy="beforeInteractive"`. That worked (JSON-LD appeared in initial HTML) but introduced two new `@next/next/no-before-interactive-script-outside-document` ESLint warnings on `IndustryLandingPage.tsx`. `pages/blog/[slug].tsx` already used the same pattern for `Article` JSON-LD with the same warning, but that does not make the new warnings pre-existing on this file.
- Final choice: replaced the two `<Script>` components with plain `<script type="application/ld+json" dangerouslySetInnerHTML>` tags, escaping `<` to `<` in the payload to prevent a stray `</script>` in FAQ answers from breaking out of the tag. Plain `<script>` tags render in the SSR output with no `next/script` lifecycle rule and no warning. Verified in the initial HTML of `/for/plumbing-services` (`<script id="industry-faq-jsonld-plumbing-services" type="application/ld+json">…`) and in the audit: all 66 GSC-reported `/for/*` URLs now report `('FAQPage', 'SoftwareApplication')` in `local_after_json_ld_types`.

### Commit `8081f8e` (this PR) — /for nav variant

- `pages/for/index.tsx`: passed `variant="marketing"` to `SiteNav` (TypeScript required prop after nav variant split).

### Note on the `/obsidianauto` → `/obsidian-auto` redirect

This is an existing Kova Wash business alias. Because the "review routing logic" is out of scope, we did not add a `/obsidianauto/` explicit entry into the alias flatMap. In practice the generic `/:path+/ → /:path+` rule catches `/obsidianauto/` first, and empirically both `/obsidianauto` and `/obsidianauto/` settle on `/obsidian-auto` in a single 308 hop on the local production server (see [`local-redirects.json`](./local-redirects.json)).

## Verification

Every check runs against the local production build (`npm run build` with default Turbopack, then `npm run start -- --port 3107`). **No production deploy was performed and no live production evidence was collected after any change.**

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

### Local redirect hops (post-fix, `http://localhost:3107`)

Captured with a Python `HTTPRedirectHandler` that never follows Location — every value below is what the local server itself returned to the first request. Full data: [`local-redirects.json`](./local-redirects.json).

| Request path | Hops locally | Local final |
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

These are app-controlled redirects and this is the local production build. The Vercel edge apex→www redirect is out of scope for `next.config.ts` and is covered under **Manual actions** below.

### Response headers (post-fix, `http://localhost:3107`)

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

Ran only against the three source files this PR modifies:

```
npx eslint components/IndustryLandingPage.tsx next.config.ts pages/for/index.tsx
```

Exit code 0, zero warnings. Nothing else in the repo was linted as part of this PR; pre-existing warnings elsewhere are not addressed here.

## Google Search Console evidence

Full per-URL after-fix mapping: [`gsc-discovered-mapping.json`](./gsc-discovered-mapping.json). Raw GSC export: [`gsc-discovered.csv`](./gsc-discovered.csv). All `local_after_*` fields in the mapping were captured against `http://localhost:3107`, **not against live production**. Live production still carries the pre-fix behaviour until this PR is merged and deployed.

### "Discovered — currently not indexed" (75 URLs, exported 2026-09-28)

Observed facts, not inferences:

- The CSV export contains 75 rows, all in the `www.usereviewflo.com` canonical form. `1969-12-31` in the "Last crawled" column is Search Console's "no crawl on record" sentinel, not a date.
- All 75 URLs are present in the current sitemap at audit time (2026-09-28).
- On live production before this branch: 72 of the 75 URLs carried duplicate `<link rel="canonical">` tags (one to `www`, one to apex), and 28 of the 75 URLs were unreachable from the homepage through crawlable initial-HTML anchors.
- On the local production build after this branch's changes: all 75 URLs return direct 200, single canonical matching the sitemap URL, matching `og:url`, non-null `<lastmod>`, and (for `/for/*` and `/blog/*`) JSON-LD in initial HTML. Every column in this claim is captured in [`gsc-discovered-mapping.json`](./gsc-discovered-mapping.json) under `local_after_*` keys.

What we **do not** claim:

- Not claimed that Google discovered these URLs from the sitemap (Google may have discovered them from links, external references, etc.).
- Not claimed to know what the sitemap looked like on the export day (the sitemap was rewritten as part of commit `f9d7a3f`).
- Not claimed the CSV export reflects Google's reason for delayed crawl. "Discovered — currently not indexed" only tells us Google knows the URL exists and has chosen not to crawl / index it right now.
- Not claimed the technical defects listed under **What we found** are the cause of exclusion. They are correlated with the exclusion set, they are objectively broken, and they are now fixed. Whether fixing them changes Google's decision is Google's call.
- Not claimed the industry landing pages are unique enough to be indexed after recrawl. They are largely templated, and Google routinely leaves templated pages "Discovered — currently not indexed" indefinitely. If exclusion persists after the next recrawl cycle, the next lever is per-page content differentiation, not additional technical fixes.

Breakdown of the 75 URLs by family:

| Family | Count | Example |
|---|---|---|
| `/for/{industry}` | 66 | `/for/plumbing-services` |
| `/blog/{slug}` and `/blog` | 6 | `/blog/how-to-get-more-google-reviews` |
| Fixed marketing | 3 | `/demo`, `/pricing`, `/privacy-policy` |

### "Page with redirect" (9 URLs from the provided screenshot)

Google is treating each of these as a redirect source pointing at a different canonical. **They are expected to stay in the "Page with redirect" category — that is the correct outcome for a URL that permanently redirects elsewhere.** Do not attempt to index the source URL. The goal is to make each source a **single permanent hop** to its canonical so signals point unambiguously; per Google's documentation, a permanent (`308`/`301`) redirect is a stronger canonical hint than a temporary (`307`/`302`) redirect, though Google decides on its own which URL to select as canonical.

Redirect status observed on live production **before** the manual Vercel change (see [`production-redirects.json`](./production-redirects.json)):

| URL as reported by GSC | Production-before hops | Notes |
|---|---|---|
| `http://usereviewflo.com/` | 3 (edge HTTPS upgrade, then apex→www 307, then app 200) | HTTP+apex |
| `https://usereviewflo.com/` | 2 (307 to www, then 200) | HTTPS+apex |
| `http://www.usereviewflo.com/` | 2 (edge HTTPS upgrade, then 200) | HTTP+www |
| `https://usereviewflo.com/for/house-cleaning` | 2 (307 to www, then 200) | HTTPS+apex |
| `https://usereviewflo.com/for/mobile-auto-detailing` | 2 (307 to www, then 200) | HTTPS+apex |
| `https://usereviewflo.com/for/painting-contractors` | 2 (307 to www, then 200) | HTTPS+apex |
| `https://usereviewflo.com/for/veterinary-clinics` | 2 (307 to www, then 200) | HTTPS+apex |
| `https://usereviewflo.com/for/law-offices` | 2 (307 to www, then 200) | HTTPS+apex |
| `https://usereviewflo.com/for/permanent-makeup` | 2 (307 to www, then 200) | HTTPS+apex |

The apex→www redirect returns HTTP `307` on production today. `307` is a temporary redirect; `308` is a permanent redirect. Changing this to `308` in the Vercel Dashboard expresses that the host migration is permanent, which is a stronger canonical hint than `307` (see **Manual actions**). This code PR cannot make that change.

There are remaining edge-controlled chains that flipping the apex→www redirect to `308` **will not** collapse into a single hop:

- **HTTP-apex** (`http://usereviewflo.com/…`): the Vercel edge upgrades HTTP to HTTPS before it applies host-rewrite rules or serves the app, so `http://usereviewflo.com/…` will still be 2 hops (HTTPS upgrade → apex→www 308) at minimum. No repo-level fix has been tested that collapses this. If Vercel supports a single-response combined HTTPS+host normalization for this case, it is not documented in a form I could verify from this branch.
- **HTTPS-apex + legacy path** (e.g. `https://usereviewflo.com/for-barbers`): once apex→www is `308` at the edge, this becomes `edge apex→www 308` followed by `app /for-barbers → /for/barber-shops 308`, i.e. 2 hops. Signals will still point at `www /for/barber-shops`, but the request itself is not one hop. This is inherent to having a host-normalization rule at the edge and a slug alias in the app.
- Internal linking always uses the `www` canonical path (no `/for-barbers`), so real user navigation stays direct.

### "Crawled — currently not indexed" (13 URLs total, 10 shown in the screenshot)

10 URLs are visible in the screenshot supplied by the user. **The remaining 3 URLs in this bucket were not visible in the screenshot and were not exported to CSV; we do not know which 3 they are without additional GSC access.**

All `Local-after` columns below are from the local production build against `http://localhost:3107`, **not from live production**:

| URL | Host | Local-after status |
|---|---|---|
| `https://www.usereviewflo.com/for/painting-contractors` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD in initial HTML |
| `https://www.usereviewflo.com/for/home-inspection-services` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD in initial HTML |
| `https://usereviewflo.com/for/hvac-repair` | apex | Local: 308 to canonical destination. Live: currently a Vercel-edge 307. Not audited on the apex host locally because localhost has no apex. |
| `https://www.usereviewflo.com/for/hvac-repair` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD in initial HTML |
| `https://www.usereviewflo.com/for/permanent-makeup` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD in initial HTML |
| `https://www.usereviewflo.com/for/vacation-rentals` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD in initial HTML |
| `https://usereviewflo.com/for/fence-installation` | apex | Local: 308 to canonical destination. Live: currently a Vercel-edge 307. |
| `https://www.usereviewflo.com/for/fence-installation` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD in initial HTML |
| `https://usereviewflo.com/for/physical-therapy` | apex | Local: 308 to canonical destination. Live: currently a Vercel-edge 307. |
| `https://www.usereviewflo.com/for/physical-therapy` | www | 200 direct, canonical matches, FAQPage+SoftwareApplication JSON-LD in initial HTML |

Same caveat as above: technical signals are now clean on the local production build. Whether Google indexes these URLs after live deploy + recrawl is Google's decision.

## Manual actions after this PR merges

These changes require human access to Vercel, Supabase, Stripe and Search Console. **None of these are automated by this PR and none of them are verified in this repo.**

### 1. Vercel — change apex→www redirect from Temporary (307) to Permanent (308)

1. Vercel Dashboard → **reviewflo** project → **Settings → Domains**.
2. Locate `usereviewflo.com` (currently marked "Redirect to www.usereviewflo.com").
3. Edit the redirect and change the status code from **Temporary (307)** to **Permanent (308)**.
4. Save.
5. Verify with `curl -sI https://usereviewflo.com/`. Expected: `HTTP/2 308` with `Location: https://www.usereviewflo.com/`.
6. Verify there is no reverse loop: `curl -sI https://www.usereviewflo.com/` should return `200`, not any redirect.
7. HTTP-apex will still take 2 hops (HTTPS upgrade at the edge, then apex→www) because Vercel forces HTTPS at the edge before the host-rewrite rule runs. No repo-level fix is available or tested for this; if Vercel later documents a combined HTTPS+host rule, that is a separate task.
8. HTTPS-apex to legacy alias paths (e.g. `https://usereviewflo.com/for-barbers`) will still take 2 hops: edge apex→www 308, then app slug-alias 308 to `/for/barber-shops`. This is inherent to having both edge host normalization and app-level slug redirects.

### 2. Vercel — environment (read only, do NOT print secrets)

Confirm `NEXT_PUBLIC_APP_URL` for **Production** is `https://www.usereviewflo.com`. Verified via Vercel API on 2026-09-28. No change needed. Preview and Development are also currently `https://www.usereviewflo.com` per the same read.

### 3. Supabase — Site URL and redirect allow list (NOT verified from this branch)

The Supabase Dashboard was not inspected as part of this PR. Please verify manually:

- Dashboard → **Authentication → URL Configuration → Site URL** should be `https://www.usereviewflo.com`.
- **Redirect URLs allow list** must include (retain any dev / localhost entries you already rely on):
  - `https://www.usereviewflo.com/auth/magic-landing`
  - `https://www.usereviewflo.com/auth/magic-landing?next=dashboard`
  - `https://www.usereviewflo.com/auth/magic-landing?next=admin`
  - `https://www.usereviewflo.com/auth/magic-landing?next=google-confirm`
  - `https://www.usereviewflo.com/join/callback`
  - `https://www.usereviewflo.com/early-access/join`
  - `https://www.usereviewflo.com/update-password`

**We did not change any auth code**, so any existing allow-list entries that currently work will keep working. Known code-side apex fallback: `pages/early-access/confirm-email.tsx` hard-codes `https://usereviewflo.com` in its redirect. Changing that is auth-adjacent code and is out of scope; the Vercel apex→www 308 will still route the browser correctly on that hop after step 1.

Similarly, `lib/auth-link-utils.ts`, `pages/api/send-password-reset.ts` and `pages/api/send-magic-link.ts` prefer `req.headers.origin`, then `NEXT_PUBLIC_APP_URL`, then apex as final fallback. In normal production traffic the request already arrives on `www` so the final fallback never fires; changing it would touch auth logic and is out of scope.

### 4. Stripe — dashboard NOT verified from this branch

Observed from code, not verified in Stripe Dashboard:

- `pages/api/create-checkout-session.ts` builds `success_url` as `${base}/dashboard?checkout=success` and `cancel_url` as `${base}/settings?section=plan`, where `base` is `req.headers.origin` → `NEXT_PUBLIC_APP_URL` → the apex string as final fallback.
- `pages/api/create-early-access-checkout.ts` builds `success_url` as `${base}/onboarding?session_id={CHECKOUT_SESSION_ID}` and `cancel_url` as `${base}/early-access`, with the same base resolution.
- Production requests arrive on `www` so `req.headers.origin` wins and the apex fallback does not fire on the code paths we inspected. The apex fallback string was not modified by this PR.

We did **not** verify:

- Any standalone Stripe Payment Links (if used).
- Stripe Customer Portal branding / return URL.
- Stripe Dashboard webhook endpoint URLs.

If any of those exist, verify manually and update to `www` if needed. Do not treat "no changes needed" as a confirmed state.

**No test payment was triggered by this PR. No Stripe code was changed.**

### 5. Google Search Console — after production deploy

After merging and deploying:

1. Confirm `https://www.usereviewflo.com/robots.txt` returns 200 with the exact body shown above.
2. Confirm `https://www.usereviewflo.com/sitemap.xml` returns 200 with 95 `<url>` entries, each with `<lastmod>`.
3. Confirm `curl -sI https://www.usereviewflo.com/api/hello` includes `X-Robots-Tag: noindex, nofollow`.
4. **URL Inspection on canonical destinations only.** Do NOT inspect or request indexing on apex or `/for-barbers`-style alias URLs — those are supposed to remain as "Page with redirect" (their canonical destination is what should get indexed):
   - `https://www.usereviewflo.com/`
   - `https://www.usereviewflo.com/pricing`
   - `https://www.usereviewflo.com/demo`
   - `https://www.usereviewflo.com/features`
   - `https://www.usereviewflo.com/for`
   - `https://www.usereviewflo.com/blog`
   - The 5 blog post URLs
   - A representative subset of `/for/{industry}` URLs from the Discovered-not-indexed list (e.g. `plumbing-services`, `hvac-repair`, `painting-contractors`, `physical-therapy`, `fence-installation`)
5. For each, click **Test live URL**, verify Google reads a single canonical (`https://www.usereviewflo.com/…`) and `Indexing allowed: Yes`, then click **Request indexing** for the priority pages only. Do not spam requests across all 66 industry URLs.
6. **Resubmit the sitemap** at Search Console → Sitemaps → enter `sitemap.xml` and click Submit.
7. Watch the **Page with redirect** count over the following weeks. Redirect **source** URLs (apex, `/for-barbers`, `/privacy`, etc.) are expected to remain classified as "Page with redirect" — that is the correct classification for a URL that permanently redirects. Do not try to move them out of that bucket. What should change over time is:
   - Fewer "Duplicate without user-selected canonical" entries, because the duplicate `<link rel="canonical">` tags are gone.
   - Some of the "Discovered — currently not indexed" URLs may transition to indexed after recrawl. No guarantee.
   - Redirect source URLs may transition from "Page with redirect" to "Alternate page with proper canonical tag" **only if Google's own canonical selection lines up with the redirect target**; this is Google's call and not something we can enforce.

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
- Auth email link generation fallbacks (`lib/auth-link-utils.ts`, `pages/api/send-password-reset.ts`, `pages/api/send-magic-link.ts`, `pages/early-access/confirm-email.tsx`). These use `req.headers.origin` → `NEXT_PUBLIC_APP_URL` → an apex string as final fallback. Changing them would touch auth logic.
- Stripe standalone Payment Links / Customer Portal branding URLs (unverified from this repo).
- Per-page copy differentiation for the 81 industry landing pages. Templated pages that differ only by industry name are Google's most common "Discovered / Crawled — currently not indexed" pattern once technical signals are clean.

## Files in this directory

| File | What it is |
|---|---|
| [`README.md`](./README.md) | This document. |
| [`production-before.json`](./production-before.json) | Full pre-fix crawl of production. 93 URLs, with per-URL canonical / robots / og:url / redirect chain / initial HTML word count. Live-production evidence baseline. |
| [`production-redirects.json`](./production-redirects.json) | Hop-by-hop chains for HTTP/HTTPS × apex/www / marketing alias combinations on live production, pre-fix. |
| [`local-after.json`](./local-after.json) | Full post-fix crawl against `http://localhost:3107` (production build). 95 URLs, 0 errors, 0 unreachable. Contains `sitemap`, `probes`, `errors`, `unreachable` arrays plus per-URL JSON-LD payloads and text stats. Not live production. |
| [`local-redirects.json`](./local-redirects.json) | Post-fix hop-by-hop chains against `http://localhost:3107` for the 9 alias / trailing-slash paths, proving each takes exactly one 308 to canonical locally. Not live production. |
| [`gsc-discovered.csv`](./gsc-discovered.csv) | Raw Search Console export of the 75 "Discovered — currently not indexed" URLs, dated 2026-09-28. |
| [`gsc-discovered-mapping.json`](./gsc-discovered-mapping.json) | Per-URL after-fix snapshot against `http://localhost:3107`. All fields prefixed `local_after_` to make the environment explicit. Not live production. |
