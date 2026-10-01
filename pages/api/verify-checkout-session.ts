import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getBusinessForRequest } from '../../lib/business-account'
import { isPaidTier } from '../../lib/tier-permissions'
import {
  billingError,
  getBillingSupabaseAdmin,
  logBillingError,
  newCorrelationId,
  type BillingErrorReason,
} from '../../lib/billing-errors'
import {
  extractSessionSubscriptionId,
  subscriptionGrantsPro,
  syncSubscriptionById,
} from '../../lib/stripe-subscription-sync'

/**
 * Additional, endpoint-local error reasons layered on top of the shared `BillingErrorReason`
 * set. Kept local (not added to `lib/billing-errors.ts`) since these are specific to
 * confirming a checkout session, not to starting one.
 */
type VerifyErrorReason = BillingErrorReason | 'session_unowned' | 'not_ready'

const VERIFY_SAFE_MESSAGES: Record<'session_unowned' | 'not_ready', string> = {
  // Deliberately identical whether the session id is malformed, unknown, or belongs to someone
  // else — never let the response shape confirm or deny which case it was.
  session_unowned: 'We could not verify that checkout session.',
  not_ready: 'Your payment is still being confirmed. Please try again in a moment.',
}

function verifyError(reason: VerifyErrorReason, requestId: string) {
  if (reason === 'session_unowned' || reason === 'not_ready') {
    return { error: VERIFY_SAFE_MESSAGES[reason], reason, requestId }
  }
  return billingError(reason, requestId)
}

function resolveAccountRootId(row: Record<string, unknown>): string {
  const parent = row.parent_business_id
  if (typeof parent === 'string' && parent.length > 0) return parent
  return String(row.id)
}

function isLiveSecretKey(secretKey: string): boolean {
  return secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_')
}

function metaStr(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/**
 * Only a proven `resource_missing` means the session id itself is bad — every other retrieval
 * failure (network, other Stripe error types, config hiccups, anything unexpected) is treated as
 * retryable rather than a denial, since none of those actually tell us the session doesn't exist
 * or isn't the caller's.
 */
function isResourceMissing(err: unknown): boolean {
  return err instanceof Stripe.errors.StripeInvalidRequestError && (err as { code?: string }).code === 'resource_missing'
}

function resolveCustomerId(customer: unknown): string | null {
  if (typeof customer === 'string' && customer.trim()) return customer
  if (customer && typeof customer === 'object' && 'id' in customer && typeof (customer as { id: unknown }).id === 'string') {
    const id = (customer as { id: string }).id
    return id.trim() ? id : null
  }
  return null
}

export interface VerifyCheckoutSessionResponse {
  status: 'confirmed' | 'payment_incomplete' | 'sync_pending'
  requestId: string
  businessId?: string
  plan?: string
  billingInterval?: string
  utmSource?: string | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = newCorrelationId()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json(verifyError('auth_required', requestId))
  }

  const { client: supabaseAdmin, error: adminInitError } = getBillingSupabaseAdmin()
  if (!supabaseAdmin) {
    logBillingError('verify-checkout-session.init', requestId, adminInitError)
    return res.status(500).json(verifyError('config_error', requestId))
  }

  const token = authHeader.replace('Bearer ', '')
  let user: { id: string; email?: string | null }
  try {
    const { data, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !data.user) {
      return res.status(401).json(verifyError('auth_invalid', requestId))
    }
    user = data.user
  } catch (err) {
    logBillingError('verify-checkout-session.auth', requestId, err)
    return res.status(500).json(verifyError('internal_error', requestId))
  }

  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : ''
  if (!/^cs_[a-zA-Z0-9_]{10,255}$/.test(sessionId)) {
    return res.status(400).json(verifyError('invalid_request', requestId))
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    logBillingError('verify-checkout-session.config', requestId, undefined, { missing: 'STRIPE_SECRET_KEY' })
    return res.status(500).json(verifyError('config_error', requestId))
  }
  const trimmedSecret = secretKey.trim()

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
      'id, tier, admin_override'
    ))
  } catch (err) {
    logBillingError('verify-checkout-session.business-lookup', requestId, err)
    return res.status(500).json(verifyError('internal_error', requestId))
  }

  if (!contextRow) {
    if (lookupErr === 'not found') {
      return res.status(403).json(verifyError('forbidden', requestId))
    }
    if (lookupErr === 'no business') {
      return res.status(404).json(verifyError('not_found', requestId))
    }
    logBillingError('verify-checkout-session.business-lookup', requestId, undefined, { reason: lookupErr ?? undefined })
    return res.status(500).json(verifyError('internal_error', requestId))
  }

  const rootId = resolveAccountRootId(contextRow)

  let stripe: Stripe
  try {
    stripe = new Stripe(trimmedSecret, {
      apiVersion: '2026-02-25.clover',
      httpClient: Stripe.createFetchHttpClient(),
      maxNetworkRetries: 0,
      timeout: 8000,
    })
  } catch (err) {
    logBillingError('verify-checkout-session.stripe-init', requestId, err)
    return res.status(500).json(verifyError('config_error', requestId))
  }

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (err) {
    logBillingError('verify-checkout-session.retrieve', requestId, err)
    if (isResourceMissing(err)) {
      // A nonexistent id and a real unowned session must look identical to the caller: never
      // confirm whether this id exists at all to someone who cannot prove it's theirs.
      return res.status(403).json(verifyError('session_unowned', requestId))
    }
    // Any other failure (network, other Stripe error types, config, unexpected) is ambiguous —
    // ask the client to retry rather than falsely denying it.
    return res.status(200).json({ status: 'sync_pending', requestId } satisfies VerifyCheckoutSessionResponse)
  }

  if (session.livemode !== isLiveSecretKey(trimmedSecret)) {
    logBillingError('verify-checkout-session.mode-mismatch', requestId, undefined, { sessionId })
    return res.status(403).json(verifyError('session_unowned', requestId))
  }

  const metaSource = metaStr(session.metadata?.source)
  const metaUserId = metaStr(session.metadata?.supabase_user_id)
  const metaBusinessId = metaStr(session.metadata?.business_id)

  // Ownership must be proven by metadata stamped at session-creation time (see
  // create-checkout-session.ts) — never trust `client_reference_id` alone, and never reveal
  // anything about a session that fails this check.
  const owned =
    metaSource === 'pro_subscription' &&
    metaUserId === user.id &&
    metaBusinessId === rootId &&
    session.mode === 'subscription'

  if (!owned) {
    return res.status(403).json(verifyError('session_unowned', requestId))
  }

  if (session.status !== 'complete') {
    return res.status(200).json({ status: 'payment_incomplete', requestId } satisfies VerifyCheckoutSessionResponse)
  }
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
    return res.status(200).json({ status: 'payment_incomplete', requestId } satisfies VerifyCheckoutSessionResponse)
  }

  const subscriptionId = extractSessionSubscriptionId(session)
  if (!subscriptionId) {
    return res.status(200).json({ status: 'payment_incomplete', requestId } satisfies VerifyCheckoutSessionResponse)
  }

  // Independently verify the subscription itself before syncing — the checkout session's own
  // metadata was already checked above, but the subscription is the thing that actually grants
  // access, and it must match this session/user/business and currently be in a paid-granting
  // state. A canceled or unrelated subscription must never confirm, even if the DB already shows
  // this business as paid from some other cause.
  let subscription: Stripe.Subscription
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId)
  } catch (err) {
    logBillingError('verify-checkout-session.pre-sync-retrieve', requestId, err, { subscriptionId })
    return res.status(200).json({ status: 'sync_pending', requestId } satisfies VerifyCheckoutSessionResponse)
  }

  const subMetaSource = metaStr(subscription.metadata?.source)
  const subMetaUserId = metaStr(subscription.metadata?.supabase_user_id)
  const subMetaBusinessId = metaStr(subscription.metadata?.business_id)

  const subscriptionCustomerId = resolveCustomerId(subscription.customer)
  const sessionCustomerId = resolveCustomerId(session.customer)

  const subscriptionMatches =
    subscriptionCustomerId !== null &&
    sessionCustomerId !== null &&
    subscriptionCustomerId === sessionCustomerId &&
    subscription.livemode === isLiveSecretKey(trimmedSecret) &&
    subMetaSource === 'pro_subscription' &&
    subMetaUserId === user.id &&
    subMetaBusinessId === rootId &&
    subscriptionGrantsPro(subscription.status)

  if (!subscriptionMatches) {
    logBillingError('verify-checkout-session.subscription-mismatch', requestId, undefined, { subscriptionId })
    return res.status(200).json({ status: 'sync_pending', requestId } satisfies VerifyCheckoutSessionResponse)
  }

  let syncResult: Awaited<ReturnType<typeof syncSubscriptionById>>
  try {
    syncResult = await syncSubscriptionById(
      { supabase: supabaseAdmin, stripe },
      subscriptionId,
      { eventId: `verify:${requestId}`, eventType: 'verify.checkout_session' }
    )
  } catch (err) {
    // syncSubscriptionById catches its own known failure modes and returns `{ ok: false }` for
    // them, but an unexpected throw (e.g. a DB client throwing instead of returning an error)
    // must degrade the same way — never let it escape unsanitized or crash the request.
    logBillingError('verify-checkout-session.sync-threw', requestId, err, { subscriptionId })
    return res.status(200).json({ status: 'sync_pending', requestId } satisfies VerifyCheckoutSessionResponse)
  }

  if (!syncResult.ok) {
    logBillingError('verify-checkout-session.sync', requestId, undefined, { reason: syncResult.reason, subscriptionId })
    return res.status(200).json({ status: 'sync_pending', requestId } satisfies VerifyCheckoutSessionResponse)
  }

  // Never trust the sync's own "action" result as proof of success (a concurrent event could
  // have raced it) — re-read the authoritative DB tier/mapping for the business this session
  // belongs to.
  let finalRow: Record<string, unknown> | null
  try {
    ;({ row: finalRow } = await getBusinessForRequest(
      supabaseAdmin,
      user.id,
      rootId,
      'id, tier, stripe_subscription_id, admin_override'
    ))
  } catch (err) {
    logBillingError('verify-checkout-session.final-lookup', requestId, err)
    return res.status(200).json({ status: 'sync_pending', requestId } satisfies VerifyCheckoutSessionResponse)
  }

  const finalTier = finalRow?.tier as 'free' | 'pro' | 'ai' | undefined
  const finalIsAdminOverride = finalRow?.admin_override === true
  // An admin override protects whatever tier was already granted (see stripe-subscription-sync);
  // otherwise the DB row must actually be mapped to *this* subscription, not just happen to be
  // paid for some unrelated reason.
  const dbMapsToThisSubscription = finalIsAdminOverride || finalRow?.stripe_subscription_id === subscriptionId

  if (!isPaidTier(finalTier) || !dbMapsToThisSubscription) {
    return res.status(200).json({ status: 'sync_pending', requestId } satisfies VerifyCheckoutSessionResponse)
  }

  // Always re-verify this subscription's live status after sync — a cancellation racing the sync
  // (even one an admin override would otherwise shield the business's tier from) must still stop
  // *this* checkout flow from reporting `confirmed` for a subscription that's no longer good.
  let reverifySubscription: Stripe.Subscription
  try {
    reverifySubscription = await stripe.subscriptions.retrieve(subscriptionId)
  } catch (err) {
    logBillingError('verify-checkout-session.post-sync-retrieve', requestId, err, { subscriptionId })
    return res.status(200).json({ status: 'sync_pending', requestId } satisfies VerifyCheckoutSessionResponse)
  }
  if (!subscriptionGrantsPro(reverifySubscription.status)) {
    return res.status(200).json({ status: 'sync_pending', requestId } satisfies VerifyCheckoutSessionResponse)
  }
  subscription = reverifySubscription

  return res.status(200).json({
    status: 'confirmed',
    requestId,
    businessId: rootId,
    plan: finalTier,
    billingInterval: metaStr(subscription.metadata?.billing_interval) || 'month',
    utmSource: metaStr(session.metadata?.utm_source),
  } satisfies VerifyCheckoutSessionResponse)
}
