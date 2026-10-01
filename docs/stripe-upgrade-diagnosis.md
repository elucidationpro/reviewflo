# Stripe upgrade diagnosis and release checklist

## Evidence (September 29–October 1, 2026)

Baseline: `e54b700` (origin/main, includes canonical indexing PR). Canonical origin is `https://www.usereviewflo.com` (`lib/seo.ts`). No live charges, live price creation, subscription migrations, or production configuration changes were performed.

### Entry points and data flow before this PR

- Pricing (`pages/pricing.tsx`), homepage pricing (`components/MarketingPricingSection.tsx`): signup CTAs; marketing still advertised $19/month and 50% launch discounts.
- Dashboard upgrade cards/buttons (`pages/dashboard.tsx`), Reviews, Outreach, RecentActivity, PastCustomerCampaigns, LocationsSection, and gated Settings features: `/settings?section=plan`.
- `LaunchBanner`: same settings destination for authenticated users, homepage pricing otherwise (banner time-gated).
- Settings “Upgrade to AI tier”: `/pricing`; Plan & Billing AI button saves a notification preference. AI is not purchasable. Legacy `/api/create-early-access-checkout` is a separate $10 one-time early-access purchase, not AI subscription checkout.
- Settings `handleProCheckout`: authenticated POST `/api/create-checkout-session` with business ID. Resolves account root, checks ownership and existing paid subscriptions, creates Stripe subscription Checkout.
- Session success: `${origin}/dashboard?checkout=success`; cancel: `${origin}/settings?section=plan`. `origin` trusted incoming Origin, then APP_URL, then apex fallback. No session ID or verified success/reconciliation UI.
- `/api/webhooks/stripe`: raw-body signature verification, checkout completion and subscription lifecycle write `businesses.tier`, `stripe_customer_id`, and `stripe_subscription_id`. `/api/my-business` reads primary/root plan and returns it for child locations; BusinessContext caches/refetches this response.

### Confirmed defects

1. Checkout requires an automatic launch coupon/promotion. Vercel variable metadata shows coupon configured for Production only, while secret, price and webhook secret target both Preview and Production. Thus preview checkout lacks the required coupon. This is a code/config defect, not proof of the customer's production failure.
2. Checkout return URLs are not pinned to the canonical www host and success does not verify/reconcile the purchase.
3. Settings already renders checkout errors, but lacks explicit retry and fetch timeout; generic API catch exposes provider/operator errors and does not consistently log failures.
4. Webhook DB failures can still return HTTP 200, preventing Stripe delivery retry. Lifecycle updates lack adequate replay/order protections. Invoice failure reads the old subscription field rather than Clover's `parent.subscription_details.subscription`.
5. Test-mode webhook is enabled at the correct canonical URL but listens only to `checkout.session.completed`; subscription lifecycle and invoice failures are not delivered to it.
6. Public and billing copy advertises automatic discounts and obsolete pricing.
7. Historical PostHog pageviews captured auth URL fragments during magic-link return. Analytics URL sanitization is included; historical data cleanup/session review remains an operator follow-up. No token values are included in this report.

### Vasquez Mobile Detailing LLC

Read-only Supabase query finds the root account on Free, with **null Stripe customer and subscription IDs**. This proves no paid plan was recorded there, not that a payment was never attempted. No name-matching customer exists in the accessible **test** Stripe account; that says nothing about live Stripe history. Live Stripe credentials/dashboard history were unavailable to this run. Read-only PostHog query confirms two checkout-start events at 15:26:38 and 15:30:09 UTC on August 20 (source Settings, canonical www host). In the inspected code, this event fires after a successful API response containing a checkout URL. The customer revisited the homepage/login and returned to a Free dashboard shortly after the first attempt. This narrows the suspected failure to hosted checkout or fulfillment but does not prove payment status. The event alone is not a payment receipt. Do not tell the customer payment succeeded or definitively failed without checking live history.

### Environment and account checks

- Local Stripe secret and publishable keys are test-mode; the app uses hosted Checkout redirect, not Stripe.js, so no publishable key is required by this checkout implementation.
- Vercel sensitive values are masked; their presence/targets can be inspected, but live/test mode, key-account pairing, exact production price/coupon validity, and signing secret agreement cannot be verified from metadata. Empty values in a local production pull are masking, **not evidence of missing deployed secrets**.
- Accessible Stripe account reports `charges_enabled`, `details_submitted`, `payouts_enabled` true. This is encouraging but does not validate deployed production credentials or rule out live account restrictions.
- Existing local test monthly price is active, USD 2,900 cents, monthly, `livemode:false`. Test account has valid 50% coupon `xTrVPcit`, but no promotion-code objects. Production launch coupon existence remains unverified.
- Vercel August 20–22 historical log request returned HTTP 400. Recent production checkout query returned no results. This is unavailable evidence, not proof of no errors.

## Implemented changes

- Checkout errors use safe messages, explicit retry, bounded requests, and sanitized correlation IDs. Production return URLs use the canonical www host; only test keys may use a test return origin.
- Webhooks reconcile current subscription state, return retryable failures for database errors, and guard against stale events, replacement-subscription races, and admin override changes. Existing subscription prices are never mutated.
- New Pro checkout uses exact $29/month or $290/year Prices with mode/currency/cadence validation. Automatic discounts are removed; manual promotion codes remain available. Public/signup/industry copy is aligned. AI remains unavailable for purchase.
- `/dashboard/checkout` verifies authenticated ownership, customer/subscription linkage, payment status, current subscription state, and the saved plan through `/api/verify-checkout-session`. It preserves the checkout reference through login, bounds retries, and keeps confirmed payment visible when a dashboard refresh fails.
- Analytics helpers preserve first-touch attribution and redact auth tokens from URL properties. `checkout_session_created`, `checkout_completed`, `checkout_failed` (safe reason), and `checkout_canceled` carry plan, interval, and first-touch source. Server completion uses a stable session UUID/timestamp for replay deduplication across webhook and verified confirmation. Analytics failures never block billing.

## Test price configuration

Reuse verified existing $29 monthly price; newly created annual and AI prices are test-mode only. AI remains Coming soon.

```
STRIPE_PRO_MONTHLY_PRICE_ID=price_1TWMj2RtxrkCLJhTZqJ6dRzX
STRIPE_PRO_ANNUAL_PRICE_ID=price_1ULCR0RtxrkCLJhTJrS7J9CO
STRIPE_AI_MONTHLY_PRICE_ID=price_1ULCR1RtxrkCLJhTC9wWB1sG
```

The price IDs are identifiers, not secrets. Application code must read env variables, not hardcode these IDs. No existing subscription price was changed.

## Jeremy's Stripe / Vercel steps before release

1. Stripe **Live mode**: confirm the correct account, activation, outstanding verification requirements and payments capability. In Product catalog, create new recurring Pro USD $29/month and USD $290/year Prices. Do not edit or migrate existing subscriptions/prices. AI $49/month can be created for later but must stay unavailable for purchase.
2. Vercel Production: set `STRIPE_PRO_MONTHLY_PRICE_ID` and `STRIPE_PRO_ANNUAL_PRICE_ID` to the **live** IDs; ensure `STRIPE_SECRET_KEY` is from the same live account. Remove obsolete automatic launch coupon/promo variables once this PR is deployed. Existing subscriber discounts remain untouched. Manual promotion codes must be created/kept active in the corresponding Stripe mode.
3. Vercel Preview: use a **test** secret and the test price IDs above; do not share live billing keys with previews. Use isolated test Supabase data for end-to-end tests. `CHECKOUT_BASE_URL` is an explicit test return origin (local or preview); production always uses canonical www. Re-deploy after changing env variables.
4. Stripe webhooks in **each mode**: register the matching environment's `/api/webhooks/stripe` URL without redirects. Production: `https://www.usereviewflo.com/api/webhooks/stripe`. Enable `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, and `invoice.payment_failed`. Copy that endpoint's signing secret to its environment's `STRIPE_WEBHOOK_SECRET`. Do not point a test webhook at a database containing real customers.
5. Stripe Live Customers/Payments/Checkout Sessions: find Vasquez by account email/name, inspect sessions around August 20, 2026, payment attempts/declines, subscription status, and webhook deliveries. If paid, reconcile the existing subscription; do not ask them to pay again. If no paid subscription exists, invite a retry only after this PR, configuration, and production smoke checks are complete.
6. Vercel runtime logs (or retained exports) and Stripe Workbench Logs: inspect August 20 checkout errors, price/coupon `resource_missing`, auth failures, and webhook status/signature errors. Replay failed live webhook events only after verifying the fix and linked customer.

7. PostHog/Supabase operator follow-up: review historical auth URL captures, use supported cleanup controls for affected analytics data/recordings, and review affected auth sessions. The new sanitizer prevents future URL-token capture through the instrumented event paths; it cannot remove historical data.

## Validation results

Automated app checks use mocked Stripe/Supabase services; real Stripe API checks are listed separately below. Production end-to-end validation and Vasquez retry remain unconfirmed until live configuration/history checks are completed.

### Automated checks

- `node --test tests/*.test.cjs`: **177 passed**, no failures. Includes real webhook signature verification against generated test signatures, mocked routes/DB/Stripe, replay/order/race protections, new prices, verification ownership/linkage, analytics payloads/deduplication, and storage helpers.
- `tsc --noEmit`: passed.
- `next build --webpack`: passed. The worktree uses a shared external `node_modules` symlink, which default Turbopack rejects; `next build --webpack` is used with build-only placeholder credentials.
- All industry JSON parses; pricing-only data edits and comparison arithmetic reviewed.
- Hosted-page card declines that produce no `invoice.payment_failed` event are not individually observable by these events. First-touch/cancellation persistence cannot survive a full browser restart when storage is unavailable.

### Local browser checks

The compiled application was opened with placeholder configuration and mocked browser responses, without writing real customer data:

- Desktop and 390px mobile pricing display $29/month, $290/year, and AI Coming soon; unauthenticated Pro CTA links to `/join?plan=pro`.
- Confirmed annual Pro remains visible when the dashboard refresh fails. Clicking Retry refresh leaves the payment verification request count unchanged.
- Missing session ID shows an invalid-link message.
- Pending verification stops after five requests (initial + four retries) with a manual retry button and no false claim that payment succeeded.
- Signed-out confirmation with its session-storage write denied shows a recoverable confirmation link and sign-in link.
- Full browser-wide sessionStorage denial was not validated end to end; the browser harness itself reads storage. Pure helper tests cover denied storage independently.

These browser checks validate UI behavior against mocks, not payment fulfillment against an isolated Stripe/Supabase environment.

### Stripe API integration checks (test mode)

- New Pro monthly test subscription `sub_1ULCXURtxrkCLJhTV5pbwkto`: active, invoice paid 2,900 cents.
- New Pro annual test subscription `sub_1ULCXXRtxrkCLJhTZ9PChuge`: active, invoice paid 29,000 cents.
- Decline fixture `pm_card_chargeDeclined` (Stripe's decline test case): `card_declined`, `generic_decline`.
- Explicit manual promotion `RFQA20260929`, 10% once: test subscription `sub_1ULCaURtxrkCLJhTvq2XySWm` active, first invoice paid 2,610 cents. This is an API promotion test, not a completed hosted-form test.
- There were no existing test subscriptions at start. Created a dedicated legacy $19/month fixture `sub_1ULCTyRtxrkCLJhTOmKJ7PxS` using `price_1ULCTxRtxrkCLJhTPBUGAHDV`, then verified it remained active on the same price after new pricing tests.
- Hosted monthly and annual Checkout Sessions created with `allow_promotion_codes:true` and no `discounts`. Browser displayed $29/month; entered decline card `4000 0000 0000 0002`, but browser submission/cancel navigation did not produce a verified result. Hosted monthly/annual completion, manual promo UI, and cancel navigation remain **not passed**.
- These QA fixtures use `source:billing_qa`, no real account metadata, and cannot upgrade a real customer through the existing webhook. They exercise Stripe separately from application/Supabase integration. No live charges were made.

Implementation references: [Stripe Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment), [Stripe invoice object](https://docs.stripe.com/api/invoices/object), and [PostHog capture API](https://posthog.com/docs/api/capture).
