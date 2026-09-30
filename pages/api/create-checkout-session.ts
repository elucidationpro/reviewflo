import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getBusinessForRequest } from '../../lib/business-account'
import { firstNonLatin1Index } from '../../lib/stripe-env-ascii'
import { isPaidTier } from '../../lib/tier-permissions'
import { resolveCheckoutBaseUrl } from '../../lib/stripe-checkout-config'
import {
  billingError,
  classifyCheckoutError,
  getBillingSupabaseAdmin,
  logBillingError,
  newCorrelationId,
} from '../../lib/billing-errors'

function resolveAccountRootId(row: Record<string, unknown>): string {
  const parent = row.parent_business_id
  if (typeof parent === 'string' && parent.length > 0) return parent
  return String(row.id)
}

function subscriptionGrantsPaid(status: Stripe.Subscription.Status): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due'
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
  const requestId = newCorrelationId()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(billingError('auth_required', requestId))
  }

  const { client: supabaseAdmin, error: adminInitError } = getBillingSupabaseAdmin()
  if (!supabaseAdmin) {
    logBillingError('create-checkout-session.init', requestId, adminInitError)
    return res.status(500).json(billingError('config_error', requestId))
  }

  const token = authHeader.replace('Bearer ', '')
  let user: { id: string; email?: string | null }
  try {
    const { data, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !data.user) {
      return res.status(401).json(billingError('auth_invalid', requestId))
    }
    user = data.user
  } catch (err) {
    logBillingError('create-checkout-session.auth', requestId, err)
    return res.status(500).json(billingError('internal_error', requestId))
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    logBillingError('create-checkout-session.config', requestId, undefined, { missing: 'STRIPE_SECRET_KEY' })
    return res.status(500).json(billingError('config_error', requestId))
  }

  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) {
    logBillingError('create-checkout-session.config', requestId, undefined, { missing: 'STRIPE_PRO_PRICE_ID' })
    return res.status(500).json(billingError('config_error', requestId))
  }

  const launchCouponId = process.env.STRIPE_LAUNCH_COUPON_ID?.trim()
  const launchPromoId = process.env.STRIPE_LAUNCH_PROMO_ID?.trim()
  if (!launchCouponId && !launchPromoId) {
    logBillingError('create-checkout-session.config', requestId, undefined, {
      missing: 'STRIPE_LAUNCH_COUPON_ID_OR_PROMO_ID',
    })
    return res.status(500).json(billingError('config_error', requestId))
  }

  const trimmedSecret = secretKey.trim()
  const trimmedPrice = priceId.trim()

  const asciiChecks: Array<[string, string | null]> = [
    ['STRIPE_SECRET_KEY', trimmedSecret],
    ['STRIPE_PRO_PRICE_ID', trimmedPrice],
    ['STRIPE_LAUNCH_COUPON_ID', launchCouponId ?? null],
    ['STRIPE_LAUNCH_PROMO_ID', launchPromoId ?? null],
  ]
  for (const [name, value] of asciiChecks) {
    if (!value) continue
    const bad = firstNonLatin1Index(value)
    if (bad) {
      logBillingError('create-checkout-session.config', requestId, undefined, {
        invalidEnv: name,
        index: bad.index,
      })
      return res.status(500).json(billingError('config_error', requestId))
    }
  }

  const businessIdParam =
    typeof req.body?.businessId === 'string' && req.body.businessId.trim()
      ? req.body.businessId.trim()
      : null

  let contextRow: Record<string, unknown> | null
  let lookupErr: string | null
  try {
    ;({ row: contextRow, error: lookupErr } = await getBusinessForRequest(
      supabaseAdmin,
      user.id,
      businessIdParam,
      'id, tier, stripe_customer_id, parent_business_id'
    ))
  } catch (err) {
    logBillingError('create-checkout-session.business-lookup', requestId, err)
    return res.status(500).json(billingError('internal_error', requestId))
  }

  if (!contextRow) {
    if (lookupErr === 'not found') {
      return res.status(403).json(billingError('forbidden', requestId))
    }
    if (lookupErr === 'no business') {
      return res.status(404).json(billingError('not_found', requestId))
    }
    logBillingError('create-checkout-session.business-lookup', requestId, undefined, { reason: lookupErr ?? undefined })
    return res.status(500).json(billingError('internal_error', requestId))
  }

  const rootId = resolveAccountRootId(contextRow)

  let rootRow: Record<string, unknown> | null
  let rootErr: string | null
  try {
    ;({ row: rootRow, error: rootErr } = await getBusinessForRequest(
      supabaseAdmin,
      user.id,
      rootId,
      'id, tier, stripe_customer_id, stripe_subscription_id'
    ))
  } catch (err) {
    logBillingError('create-checkout-session.root-lookup', requestId, err)
    return res.status(500).json(billingError('internal_error', requestId))
  }

  if (!rootRow) {
    if (rootErr === 'not found') {
      return res.status(403).json(billingError('forbidden', requestId))
    }
    if (rootErr === 'no business') {
      return res.status(404).json(billingError('not_found', requestId))
    }
    logBillingError('create-checkout-session.root-lookup', requestId, undefined, { reason: rootErr ?? undefined })
    return res.status(500).json(billingError('internal_error', requestId))
  }

  const tier = rootRow.tier as string | null | undefined
  if (isPaidTier(tier as 'free' | 'pro' | 'ai')) {
    return res.status(403).json(billingError('already_subscribed', requestId))
  }

  const stripeCustomerId =
    typeof rootRow.stripe_customer_id === 'string' && rootRow.stripe_customer_id.trim()
      ? rootRow.stripe_customer_id.trim()
      : undefined

  if (!stripeCustomerId && !user.email) {
    return res.status(400).json(billingError('missing_email', requestId))
  }

  const baseUrl = resolveCheckoutBaseUrl(trimmedSecret)

  try {
    const stripe = new Stripe(trimmedSecret, {
      apiVersion: '2026-02-25.clover',
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 0,
      timeout: 8000,
    })

    // Safety net: if DB tier is stale but Stripe already has an active/trialing/past_due
    // subscription for this customer, heal DB and block creating a duplicate checkout.
    if (stripeCustomerId) {
      const existingSubs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 20,
      })
      const paidSub = existingSubs.data.find((sub) => subscriptionGrantsPaid(sub.status))
      if (paidSub) {
        const { error: healErr } = await supabaseAdmin
          .from('businesses')
          .update({
            tier: 'pro',
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: paidSub.id,
          })
          .eq('id', String(rootRow.id))
        if (healErr) {
          logBillingError('create-checkout-session.heal-tier', requestId, healErr, { reason: 'db_error' })
        }

        return res.status(403).json(billingError('already_subscribed', requestId))
      }
    }

    const knownSubId =
      typeof rootRow.stripe_subscription_id === 'string' && rootRow.stripe_subscription_id.trim()
        ? rootRow.stripe_subscription_id.trim()
        : null
    if (knownSubId) {
      const sub = await stripe.subscriptions.retrieve(knownSubId)
      if (subscriptionGrantsPaid(sub.status)) {
        const { error: healErr } = await supabaseAdmin
          .from('businesses')
          .update({
            tier: 'pro',
            ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
            stripe_subscription_id: sub.id,
          })
          .eq('id', String(rootRow.id))
        if (healErr) {
          logBillingError('create-checkout-session.heal-tier', requestId, healErr, { reason: 'db_error' })
        }
        return res.status(403).json(billingError('already_subscribed', requestId))
      }
    }

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
        logBillingError('create-checkout-session.customer-sync', requestId, customerSyncErr)
      }
    }

    let discounts: Stripe.Checkout.SessionCreateParams.Discount[]
    try {
      discounts = await buildLaunchDiscounts(stripe)
    } catch (discountErr) {
      logBillingError(
        'create-checkout-session.discounts',
        requestId,
        discountErr,
        discountErr instanceof Stripe.errors.StripeError
          ? undefined
          : { detail: discountErr instanceof Error ? discountErr.message : undefined }
      )
      return res.status(500).json(billingError('config_error', requestId))
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: trimmedPrice, quantity: 1 }],
      discounts,
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/settings?section=plan`,
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
      logBillingError('create-checkout-session.no-url', requestId, undefined)
      return res.status(500).json(billingError('stripe_error', requestId))
    }

    return res.status(200).json({ url: session.url, requestId })
  } catch (error: unknown) {
    const reason = classifyCheckoutError(error)
    logBillingError('create-checkout-session', requestId, error)
    return res.status(500).json(billingError(reason, requestId))
  }
}
