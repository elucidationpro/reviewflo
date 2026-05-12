import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getBusinessForRequest } from '../../lib/business-account'
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
    const stripe = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 0,
      timeout: 8000,
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
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
    const stripeErr = error as Record<string, unknown>
    console.error('[CHECKOUT_FAIL]', JSON.stringify({
      type: stripeErr?.type,
      code: stripeErr?.code,
      message: stripeErr?.message,
      param: stripeErr?.param,
      statusCode: stripeErr?.statusCode,
      raw: stripeErr?.raw,
    }))
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
