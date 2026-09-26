# ReviewFlo flow and security audit — 2026-09-26

Repository: https://github.com/elucidationpro/reviewflo (local ~/reviewflow).
Branch: codex/reviewflo-auth-isolation-audit. Live app: https://www.usereviewflo.com.

## Scope and customer flow

ReviewFlo sells to local business owners. Their customers use a public per-business review link, submit a star rating, optionally answer a follow-up question, and can submit private feedback or continue to an external review platform. Business owners manage settings, locations, requests, feedback and subscription billing. Internal administrators need a separate admin surface with no business onboarding requirement.

Browser tests use localhost:3100 with isolated temporary accounts in the connected Supabase project. No external review is posted. Email delivery is intercepted for the browser feedback test. Outbound campaigns, charges, SMS and Google review replies are not executed.

## Confirmed findings and fixes

1. **Critical: editable admin role.** lib/adminAuth.ts accepted user_metadata.role, which authenticated users can change. Server checks now accept only app_metadata.role or a verified email in the server allowlist. Browser authorization is verified by the API and fails closed.
2. **Critical: public business data exposure.** An anonymous Supabase request successfully read business owner-email and OAuth-token columns (values were not logged). Public pages used SELECT * and serialized the record. All four public pages now use an explicit public projection; a migration removes public table reads and restricts reads to ownership even if legacy permissive policies exist. Database migration is required to close direct REST access.
3. **Admin routing.** Google callbacks only bypassed onboarding for admins without business records; magic-link signup ignored its API admin result; login accepted a client redirect override. Admins now land on /admin even with incomplete records, with a route guard before mounting client pages.
4. **Ownership reassignment.** my-business automatically reassigned records by owner_email. Removed this recovery path; ownership comes from authenticated user_id. Requests for another business now return 403 instead of falling back silently.
5. **Google connection session exposure/CSRF.** GBP OAuth state contained a Supabase bearer token in the URL. It now uses an expiring signed payload tied to an HttpOnly same-site cookie; ownership is checked at initiation and callback.
6. **Scheduled endpoints failed open.** Missing CRON_SECRET previously disabled authorization. Active scheduler handlers now reject requests unless the secret is configured and matches.
7. **Multi-location plan and login gaps.** API business resolution now inherits the authenticated root subscription; Google existing-account lookups choose the root rather than treating multiple locations as a missing account. Identity-only Google login no longer overwrites a previously connected GBP token/name.
8. **Disconnected feedback.** The normal low-rating route dropped the just-created reviewId. It now carries it to the feedback page, matching the follow-up route.
9. **Lint tooling.** Replaced obsolete FlatCompat usage with Next 16 flat config imports so lint can run.

10. **Cross-tenant database RPC mutation.** Cloud inspection found SECURITY DEFINER recalculate_monthly_summary callable by anonymous users with arbitrary business IDs. A second migration restricts execution to service_role and pins search_path.

## Verification so far

- Production Next.js build passed; TypeScript passed.
- Eleven security unit tests passed (admin identity, private-field projection, signed OAuth state, browser-cookie binding, cross-tenant lookup, subscription inheritance).
- 21 local API integration assertions passed using actual authenticated temporary accounts: admin privilege escalation rejected; cross-tenant read/write and connection access rejected; own business access; public API and SSR projection; rating/follow-up submission; scheduler authorization.
- Anonymous and other-tenant queries returned no rows for the fixture review data. Empty-table probes also covered feedback, review requests, campaign contacts and Google stats; those alone do not prove isolation for populated tables.
- Free-tier sending was rejected with 403 before any email could be sent.
- Browser: password login succeeds for normal account; dashboard loads; administrator with incomplete business record redirects from /dashboard to /admin; public three-star route reaches follow-up then private feedback with Google link still available.

## Release requirements and remaining scope

Deploy application before applying supabase/migrations/20260926000000_tenant_isolation.sql. Also apply supabase/migrations/20260926001000_restrict_revenue_rpc.sql. Then re-run anonymous and cross-tenant database probes, public customer submission and owner dashboard checks. Confirm CRON_SECRET in Vercel and restore scheduled operation with matching config.

The audit cannot establish that exposed integration tokens were never accessed. Review provider/database access logs and rotate or reconnect exposed integration credentials as appropriate; do not silently revoke active customer integrations.

Google live consent and automatic review-link discovery require a separate authenticated Google test. The existing GBP resolver defaults to the first Google account/location, so automatic selection for users managing multiple Google locations remains a product gap. Actual email/SMS delivery, Stripe charging/webhook lifecycle, campaign scheduling and public abuse/rate limiting need separate end-to-end verification. This is not a blanket security guarantee.

Supabase guidance: https://supabase.com/docs/guides/auth/users and https://supabase.com/docs/guides/database/postgres/row-level-security.

## Browser evidence

Screenshots in screenshots/: business-dashboard.png, customer-mobile-rating.png, customer-google-handoff.png, customer-feedback-submitted.png, google-signin-handoff.png. Images were visually inspected where noted in the session. The Google handoff used Obsidian Auto's public place ID with permission and stopped at Google sign-in, with no review posted. Feedback email was suppressed at a local reverse proxy; the real Supabase feedback write succeeded and the owner's inbox showed it. The test browser's network interception stalled requests, so the local proxy replaced interception; that stall was a test-tool issue, not reproduced in the un-intercepted flow.

Cloud metadata checks confirmed no orphan businesses and no child locations in production, no user_metadata-based RLS policies, owner-scoped revenue tables, and no user-write storage policies. Public logo reads are intentional. Eight business rows have Google refresh tokens populated; nine have access tokens populated. These credentials were exposed by the old public table policy. Stripe customer/subscription IDs are identifiers, not secret keys: do not rotate or recreate Stripe customer/subscription records merely because their IDs were visible.

## Production result

- Commit a1a736d04a9ffb8e521d26115e92d15760f3e9c5 pushed to main and deployed READY as dpl_5XXrokgq1MQTEjAoL8vhzuFxzUid on www.usereviewflo.com / usereviewflo.com.
- Supabase applied tenant_isolation (migration history version 20260926162455) and restrict_revenue_rpc (20260926162508) after the application was live.
- All 21 API integration assertions passed again against production. Additional direct database checks confirmed: anonymous private business reads return zero rows; other-tenant business reads return zero rows; anonymous/authenticated revenue RPC execution is denied; legitimate public feedback INSERT and owner reads still work; populated feedback is hidden from other tenants; direct tier updates and feedback linked to another business's review are denied.
- Live browser confirmed admin redirect to /admin, normal owner dashboard access, and Obsidian Auto's public review page after the database restriction.
- All three temporary auth accounts and businesses, plus their review and feedback records, were removed and absence verified. Test credentials and local browser state were removed.
- Vercel CLI authentication completed. Production environment metadata confirms CRON_SECRET already exists (also available in Preview). Project cron metadata confirms scheduling is enabled and all five expected schedules target the READY production deployment dpl_5XXrokgq1MQTEjAoL8vhzuFxzUid. No configuration change or redeployment was required. No scheduler was invoked with authorization, so actual outbound scheduled delivery remains outside this verification.
- Following the user's request to fix the remaining issue, exposed Google credentials were remediated on September 26: seven refresh tokens revoked (HTTP 200), one already invalid (HTTP 400 invalid_token), all nine stored access tokens invalid. Cleared token/expiry fields on the nine affected records with compare-and-set protection. Verified zero remaining credential rows and unchanged review URLs/place IDs. Affected owners must approve Google again for connected features. No evidence of misuse has been established; log review limitations are recorded below. Tokens were never printed or copied into reports.

## Google credential remediation

Seven affected named records: STEM Child Care, Le Local du Barbier, Vasquez Mobile Detailing LLC, Obsidian Auto, Made in the Shade Ft Myers, The Secret Spa - NOVA, and admin; two unnamed records were also cleared. Seven refresh grants were revoked, one was already invalid, and the ninth record had only an invalid access token. Stored public review links and Google place IDs were compared before/after and preserved for all nine records. The live Obsidian Auto public page still returned HTTP 200. Existing accounts and review data were retained. No customer notification was sent.

Business owners who use Google Business Profile syncing/replies must reconnect in Settings → Review Links → Connect Google Business Profile. Free-plan owners can continue using saved manual review links and may be prompted for Google sign-in consent again. Google consent cannot be completed on an owner's behalf.

Revocation follows Google's documented endpoint and affects the associated Google user's grants for this OAuth project: https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke . Google notes propagation may take some time.

### Historical log review

Read-only Supabase edge-log review found approximately 24 hours of pre-fix history visible (September 25 ~16:38 UTC to September 26 16:24 UTC). There were 15 successful anonymous slug-filtered SELECT * reads, consistent with the old public page flow; these requests still exposed full business rows, even though they did not explicitly name token columns. A single anonymous sensitive-column probe at September 26 15:03 UTC followed a table-count probe, and the same IP subsequently performed service-role fixture operations. This pattern is consistent with the authorized audit, but attribution was not independently established. Scanner slug requests returned no rows. No response payloads are retained, and older exposure history was unavailable. These logs do not establish absence of misuse.
