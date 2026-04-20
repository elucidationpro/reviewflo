# Custom domains for review links (future)

Goal: customer-facing review URLs can live on **the business’s own domain** (e.g. `https://reviews.acmeplumbing.com` or `https://go.acmeplumbing.com`) so links in email/SMS feel first-party and trustworthy.

## What is (and isn’t) possible

- **You cannot** host `usereviewflo.business.com` without the business delegating DNS for `business.com` to you. Subdomains are always under **whoever controls the zone** (the business’s registrar/DNS).
- **You can** offer:
  - **Custom domain (recommended):** `reviews.theirbrand.com` → CNAME (or ALIAS) to ReviewFlo / Vercel; SSL issued after verification.
  - **Easier fallback:** `theirbrand.usereviewflo.com` (no DNS work for them; less “first-party”).

## High-level implementation (when prioritized)

1. **Database** — e.g. `custom_review_domain`, `custom_domain_verification_token`, `custom_domain_status` (`pending` | `verified` | `failed`).
2. **Vercel** — Add each hostname to the project; customer adds **CNAME** (e.g. `reviews` → Vercel’s target). Wait for SSL “ready.”
3. **Routing** — Resolve business by `Host` header (verified custom domain) in addition to `/[slug]`. Optionally serve the flow at `/` on that host so the public URL has no slug.
4. **Product** — Settings UI: “Connect domain,” DNS instructions, status, disconnect. Tier gate (e.g. Pro/AI). Update email/SMS templates to use the custom base URL when verified.
5. **Ops** — Support playbook for DNS mistakes, propagation delays, and A2P/SMS link consistency.

## Value

- **Customers:** Higher trust, fewer “random link” objections; aligns with brand.
- **ReviewFlo:** Differentiator; justify as paid tier feature; some support burden.

## Related

- Pre-push verification once shipped: see `docs/PRE_PUSH_CHECKLIST.md`.
- Current AI / SMS / CRM backlog: `docs/AI_FEATURES_STATUS.md`.
