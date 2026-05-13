import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getBusinessForRequest } from '../../lib/business-account'
import { firstNonLatin1Index } from '../../lib/stripe-env-ascii'
import { isPaidTier } from '../../lib/tier-permissions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function resolveAccountRootId(row: Record<string, unknown>): string {
  const parent = row.parent_business_id
  if (typeof parent === 'string' && parent.length > 0) return parent
  return String(row.id)
}

/**
 * Stripe Checkout reliably applies server-side discounts via `discounts: [{ coupon }]`
 * (see https://docs.stripe.com/payments/checkout/discounts ). Promotion code objects
 * (`promo_…`) sometimes do not change the subscription line item until restrictions
 * match; we resolve unrestricted promos to their underlying coupon for Checkout.
 *
 * Use `STRIPE_LAUNCH_COUPON_ID` with the Dashboard **ID** (e.g. `cRmgHIfI` or `coupon_…`) to skip lookup.
 */
async function buildLaunchDiscounts(stripe: Stripe): Promise<Stripe.Checkout.SessionCreateParams.Discount[]> {
  const couponEnv = process.env.STRIPE_LAUNCH_COUPON_ID?.trim()
  if (couponEnv) {
    try {
      // Validate early so we can return a clear, actionable error.
      const c = await stripe.coupons.retrieve(couponEnv)
      return [{ coupon: c.id }]
    } catch (err: unknown) {
      // Common operator issue: mixed-case custom coupon IDs copied with wrong case.
      const stripeErr = err as Stripe.errors.StripeError & { code?: string }
      if (stripeErr?.code === 'resource_missing') {
        try {
          const page = await stripe.coupons.list({ limit: 100 })
          const caseInsensitiveMatch = page.data.find((c) => c.id.toLowerCase() === couponEnv.toLowerCase())
          if (caseInsensitiveMatch) {
            return [{ coupon: caseInsensitiveMatch.id }]
          }
        } catch {
          // If listing fails, preserve original error path below.
        }
      }
      throw err
    }
  }

  const promoOrCoupon = process.env.STRIPE_LAUNCH_PROMO_ID?.trim()
  if (!promoOrCoupon) {
    throw new Error('Set STRIPE_LAUNCH_COUPON_ID or STRIPE_LAUNCH_PROMO_ID for the launch discount.')
  }

  if (promoOrCoupon.startsWith('coupon_')) {
    return [{ coupon: promoOrCoupon }]
  }

  if (!promoOrCoupon.startsWith('promo_')) {
    throw new Error('STRIPE_LAUNCH_PROMO_ID must be a promotion code id (promo_…) or coupon id (coupon_).')
  }

  const pc = await stripe.promotionCodes.retrieve(promoOrCoupon)

  if (!pc.active) {
    throw new Error(`Promotion code ${promoOrCoupon} is not active in Stripe (expired, max redemptions, or disabled).`)
  }

  const restrictedToCustomer = pc.customer != null
  const firstTimeOnly = pc.restrictions?.first_time_transaction === true
  if (restrictedToCustomer || firstTimeOnly) {
    return [{ promotion_code: promoOrCoupon }]
  }

  const c = pc.promotion?.coupon
  if (pc.promotion?.type !== 'coupon' || !c) {
    throw new Error('Promotion code is not linked to a coupon (unexpected promotion type).')
  }
  const couponId = typeof c === 'string' ? c : (c as Stripe.Coupon).id
  return [{ coupon: couponId }]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please sign in to continue.' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    console.error('STRIPE_SECRET_KEY is not set')
    return res.status(500).json({
      error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.',
    })
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) {
    console.error('STRIPE_PRO_PRICE_ID is not set')
    return res.status(500).json({
      error: 'Pro checkout is not configured. Add STRIPE_PRO_PRICE_ID (Stripe recurring price for Pro).',
    })
  }

  const launchCouponId = process.env.STRIPE_LAUNCH_COUPON_ID?.trim()
  const launchPromoId = process.env.STRIPE_LAUNCH_PROMO_ID?.trim()
  if (!launchCouponId && !launchPromoId) {
    console.error('Neither STRIPE_LAUNCH_COUPON_ID nor STRIPE_LAUNCH_PROMO_ID is set')
    return res.status(500).json({
      error:
        'Pro launch discount is not configured. Set STRIPE_LAUNCH_COUPON_ID (coupon ID from Stripe → Coupon details, e.g. cRmgHIfI or coupon_…) or STRIPE_LAUNCH_PROMO_ID (promo_…). Prefer the coupon ID for reliable Checkout auto-apply.',
    })
  }

  const trimmedSecret = secretKey.trim()
  const trimmedPrice = priceId.trim()
  const badKey = firstNonLatin1Index(trimmedSecret)
  if (badKey) {
    console.error('[create-checkout-session] STRIPE_SECRET_KEY has non-ASCII at index', badKey.index)
    return res.status(500).json({
      error:
        'Stripe secret key in the server environment contains a non-ASCII character (often a mis-copied key or invisible Unicode). Open Vercel → Environment Variables, delete STRIPE_SECRET_KEY, and paste the key again from Stripe Dashboard (Developers → API keys) so it is only letters, numbers, and underscores after sk_live_ / sk_test_.',
      _debug: { env: 'STRIPE_SECRET_KEY', index: badKey.index, charCode: badKey.code },
    })
  }
  const badPrice = firstNonLatin1Index(trimmedPrice)
  if (badPrice) {
    console.error('[create-checkout-session] STRIPE_PRO_PRICE_ID has non-ASCII at index', badPrice.index)
    return res.status(500).json({
      error:
        'Stripe price ID in the server environment contains invalid characters. Re-copy STRIPE_PRO_PRICE_ID from Stripe (plain ASCII only).',
      _debug: { env: 'STRIPE_PRO_PRICE_ID', index: badPrice.index, charCode: badPrice.code },
    })
  }

  const badCoupon = launchCouponId ? firstNonLatin1Index(launchCouponId) : null
  if (badCoupon) {
    console.error('[create-checkout-session] STRIPE_LAUNCH_COUPON_ID has non-ASCII at index', badCoupon.index)
    return res.status(500).json({
      error: 'STRIPE_LAUNCH_COUPON_ID contains invalid characters. Re-copy from Stripe (ASCII only).',
      _debug: { env: 'STRIPE_LAUNCH_COUPON_ID', index: badCoupon.index, charCode: badCoupon.code },
    })
  }
  const badPromo = launchPromoId ? firstNonLatin1Index(launchPromoId) : null
  if (badPromo) {
    console.error('[create-checkout-session] STRIPE_LAUNCH_PROMO_ID has non-ASCII at index', badPromo.index)
    return res.status(500).json({
      error: 'STRIPE_LAUNCH_PROMO_ID contains invalid characters. Re-copy from Stripe (ASCII only).',
      _debug: { env: 'STRIPE_LAUNCH_PROMO_ID', index: badPromo.index, charCode: badPromo.code },
    })
  }

  const businessIdParam =
    typeof req.body?.businessId === 'string' && req.body.businessId.trim()
      ? req.body.businessId.trim()
      : null

  const { row: contextRow, error: lookupErr } = await getBusinessForRequest(
    supabaseAdmin,
    user.id,
    businessIdParam,
    'id, tier, stripe_customer_id, parent_business_id'
  )

  if (!contextRow) {
    return res.status(lookupErr === 'not found' ? 403 : 404).json({ error: 'Business not found' })
  }

  const rootId = resolveAccountRootId(contextRow)

  const { row: rootRow, error: rootErr } = await getBusinessForRequest(
    supabaseAdmin,
    user.id,
    rootId,
    'id, tier, stripe_customer_id'
  )

  if (!rootRow) {
    return res.status(rootErr === 'not found' ? 403 : 404).json({ error: 'Business not found' })
  }

  const tier = rootRow.tier as string | null | undefined
  if (isPaidTier(tier as 'free' | 'pro' | 'ai')) {
    return res.status(403).json({ error: 'Your account is already on a paid plan.' })
  }

  const stripeCustomerId =
    typeof rootRow.stripe_customer_id === 'string' && rootRow.stripe_customer_id.trim()
      ? rootRow.stripe_customer_id.trim()
      : undefined

  if (!stripeCustomerId && !user.email) {
    return res.status(400).json({
      error:
        'Add an email address to your account before subscribing (Settings → profile), or contact support.',
    })
  }
  const origin =
    (typeof req.headers.origin === 'string' && req.headers.origin) ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://usereviewflo.com'

  try {
    const stripe = new Stripe(trimmedSecret, {
      apiVersion: '2026-01-28.clover',
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 0,
      timeout: 8000,
    })

    // Stripe receipts/invoices rely on Customer.email for subscriptions.
    // Ensure existing customers have the current signed-in email when available.
    if (stripeCustomerId && user.email) {
      try {
        const existing = await stripe.customers.retrieve(stripeCustomerId)
        if (!existing.deleted) {
          const existingEmail =
            typeof existing.email === 'string' ? existing.email.trim().toLowerCase() : ''
          const desiredEmail = user.email.trim().toLowerCase()
          if (desiredEmail && existingEmail !== desiredEmail) {
            await stripe.customers.update(stripeCustomerId, { email: user.email })
          }
        }
      } catch (customerSyncErr) {
        console.warn(
          '[create-checkout-session] Unable to verify/set Stripe customer email before checkout:',
          customerSyncErr
        )
      }
    }

    const discounts = await buildLaunchDiscounts(stripe)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: trimmedPrice, quantity: 1 }],
      discounts,
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/settings?section=plan`,
      client_reference_id: user.id,
      ...(stripeCustomerId
        ? { customer: stripeCustomerId }
        : {
            // Subscription mode: Stripe creates the Customer at checkout completion when email is set.
            // Do not set `customer_creation` here — Stripe only allows it for `mode: 'payment'`.
            ...(user.email ? { customer_email: user.email } : {}),
          }),
      subscription_data: {
        metadata: {
          source: 'pro_subscription',
          business_id: String(rootRow.id),
          supabase_user_id: user.id,
        },
      },
      metadata: {
        source: 'pro_subscription',
        business_id: String(rootRow.id),
        supabase_user_id: user.id,
      },
    })

    if (!session.url) {
      return res.status(500).json({ error: 'Stripe did not return a checkout URL.' })
    }

    return res.status(200).json({ url: session.url })
  } catch (error: unknown) {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === 'resource_missing' &&
      error.param === 'discounts[0][coupon]'
    ) {
      return res.status(500).json({
        error:
          'Launch discount coupon was not found in the Stripe account used by STRIPE_SECRET_KEY. Re-copy STRIPE_LAUNCH_COUPON_ID from this same Stripe account/mode (Live), or use a generated coupon_... id.',
      })
    }
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === 'resource_missing' &&
      (error.param === 'line_items[0][price]' || error.message?.includes('No such price'))
    ) {
      console.error(
        '[create-checkout-session] STRIPE_PRO_PRICE_ID is missing in this Stripe account (wrong mode, deleted price, or different account). Set it to Products → your Pro plan → Pricing → Price ID.'
      )
      return res.status(500).json({
        error:
          'Checkout is not wired to a valid Stripe price. In Vercel (or .env.local), set STRIPE_PRO_PRICE_ID to the recurring price ID from the same Stripe account as STRIPE_SECRET_KEY (test vs live must match).',
      })
    }
    const err = error as { message?: string }
    const message =
      err?.message || (error instanceof Error ? error.message : 'Failed to create checkout session')
    return res.status(500).json({ error: message })
  }
}
