import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getBusinessForRequest } from '../../lib/business-account'
import { firstNonLatin1Index } from '../../lib/stripe-env-ascii'
import { isPaidTier } from '../../lib/tier-permissions'
import { resolveCheckoutBaseUrl } from '../../lib/stripe-checkout-config'
import {
  parseBillingInterval,
  parsePlan,
  proPriceEnvVar,
  resolveProPriceId,
  validateProPrice,
  type BillingInterval,
} from '../../lib/billing-plans'
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

  const plan = parsePlan(req.body?.plan)
  if (!plan) {
    return res.status(400).json(billingError('invalid_request', requestId))
  }

  const interval = parseBillingInterval(req.body?.interval) as BillingInterval | null
  if (!interval) {
    return res.status(400).json(billingError('invalid_request', requestId))
  }

  const priceEnvVar = proPriceEnvVar(interval)
  const priceId = resolveProPriceId(interval)
  if (!priceId) {
    logBillingError('create-checkout-session.config', requestId, undefined, { missing: priceEnvVar })
    return res.status(500).json(billingError('config_error', requestId))
  }

  const trimmedSecret = secretKey.trim()
  const trimmedPrice = priceId

  const asciiChecks: Array<[string, string | null]> = [
    ['STRIPE_SECRET_KEY', trimmedSecret],
    [priceEnvVar, trimmedPrice],
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
    // subscription for this customer, block creating a duplicate checkout. Do NOT write
    // to the DB here — an unauthenticated-by-webhook, unconditional tier write from this
    // route would bypass the race/admin-override protections the webhook sync applies.
    // The webhook (or a verified confirmation flow) is the only safe place to reconcile tier.
    if (stripeCustomerId) {
      const existingSubs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'all',
        limit: 20,
      })
      const paidSub = existingSubs.data.find((sub) => subscriptionGrantsPaid(sub.status))
      if (paidSub) {
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

    const isLiveKey = trimmedSecret.startsWith('sk_live_') || trimmedSecret.startsWith('rk_live_')
    const price = await stripe.prices.retrieve(trimmedPrice)
    const priceMismatch = validateProPrice(price, interval, isLiveKey)
    if (priceMismatch) {
      logBillingError('create-checkout-session.price-validation', requestId, undefined, {
        reason: priceMismatch,
        priceEnvVar,
      })
      return res.status(500).json(billingError('config_error', requestId))
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: trimmedPrice, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/dashboard/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings?section=plan&checkout=canceled&billing_interval=${interval}`,
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
          plan,
          billing_interval: interval,
        },
      },
      metadata: {
        source: 'pro_subscription',
        business_id: String(rootRow.id),
        supabase_user_id: user.id,
        plan,
        billing_interval: interval,
      },
    })

    if (!session.url) {
      logBillingError('create-checkout-session.no-url', requestId, undefined)
      return res.status(500).json(billingError('stripe_error', requestId))
    }

    return res.status(200).json({ url: session.url, sessionId: session.id, requestId })
  } catch (error: unknown) {
    const reason = classifyCheckoutError(error)
    logBillingError('create-checkout-session', requestId, error)
    return res.status(500).json(billingError(reason, requestId))
  }
}
