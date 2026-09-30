import crypto from 'crypto'
import Stripe from 'stripe'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Stable, non-leaking reasons for checkout failures. The customer-facing message for each
 * reason is fixed below; never build a customer-facing message from a caught error directly.
 */
export type BillingErrorReason =
  | 'auth_required'
  | 'auth_invalid'
  | 'not_found'
  | 'forbidden'
  | 'already_subscribed'
  | 'missing_email'
  | 'config_error'
  | 'invalid_request'
  | 'stripe_error'
  | 'upstream_timeout'
  | 'internal_error'

export interface BillingErrorPayload {
  error: string
  reason: BillingErrorReason
  requestId: string
}

const SAFE_MESSAGES: Record<BillingErrorReason, string> = {
  auth_required: 'Please sign in to continue.',
  auth_invalid: 'Invalid or expired session. Please sign in again.',
  not_found: 'We could not find that business.',
  forbidden: 'You do not have access to that business.',
  already_subscribed: 'Your account already has an active subscription.',
  missing_email:
    'Add an email address to your account before subscribing (Settings → profile), or contact support.',
  config_error: 'Checkout is temporarily unavailable. Please try again shortly.',
  invalid_request: 'We could not start checkout with the details provided.',
  stripe_error: 'We could not start checkout. Please try again.',
  upstream_timeout: 'Checkout took too long to respond. Please try again.',
  internal_error: 'Something went wrong starting checkout. Please try again.',
}

export function newCorrelationId(): string {
  return crypto.randomUUID()
}

/** Build the JSON body for a safe, customer-facing billing error response. */
export function billingError(
  reason: BillingErrorReason,
  requestId: string,
  overrideMessage?: string
): BillingErrorPayload {
  return { error: overrideMessage || SAFE_MESSAGES[reason], reason, requestId }
}

/** Map a caught error to a stable reason. Never derive the customer-facing message from it. */
export function classifyCheckoutError(err: unknown): BillingErrorReason {
  if (err instanceof Stripe.errors.StripeConnectionError) return 'upstream_timeout'
  if (err instanceof Stripe.errors.StripeAuthenticationError) return 'config_error'
  if (err instanceof Stripe.errors.StripePermissionError) return 'config_error'
  if (err instanceof Stripe.errors.StripeInvalidRequestError) return 'config_error'
  if (err instanceof Stripe.errors.StripeRateLimitError) return 'stripe_error'
  if (err instanceof Stripe.errors.StripeAPIError) return 'stripe_error'
  if (err instanceof Stripe.errors.StripeError) return 'stripe_error'
  return 'internal_error'
}

/**
 * Structured, sanitized log fields for a billing error. Only Stripe's own structured fields
 * (type/code/param/requestId/statusCode) and non-Stripe error codes/names are captured —
 * never a raw Stripe error message, secrets, auth tokens, or customer PII. Call sites may pass
 * `extra.detail` for text they know is safe (e.g. a message thrown by our own config-validation
 * code), never for messages sourced from Stripe or a database row.
 */
export function billingLogFields(
  scope: string,
  requestId: string,
  err: unknown,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  const base: Record<string, unknown> = { scope, requestId, ...extra }
  if (err instanceof Stripe.errors.StripeError) {
    base.provider = 'stripe'
    base.stripeType = err.type
    base.stripeCode = (err as { code?: string }).code
    base.stripeParam = (err as { param?: string }).param
    base.stripeRequestId = (err as { requestId?: string }).requestId
    base.statusCode = (err as { statusCode?: number }).statusCode
    return base
  }
  if (err && typeof err === 'object') {
    const e = err as { name?: string; code?: string | number }
    base.errorName = e.name || 'Error'
    if (e.code !== undefined) base.errorCode = e.code
    return base
  }
  if (err !== undefined) base.errorName = 'unknown'
  return base
}

export function logBillingError(
  scope: string,
  requestId: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  console.error('[billing]', billingLogFields(scope, requestId, err, extra))
}

let cachedClient: SupabaseClient | null = null
let cachedError: unknown = null

/**
 * Lazily construct the Supabase admin client so a missing/invalid env var surfaces as a
 * per-request config error instead of throwing at module load and crashing the route.
 */
export function getBillingSupabaseAdmin(): { client: SupabaseClient | null; error: unknown } {
  if (cachedClient) return { client: cachedClient, error: null }
  if (cachedError) return { client: null, error: cachedError }
  try {
    cachedClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    return { client: cachedClient, error: null }
  } catch (err) {
    cachedError = err
    return { client: null, error: err }
  }
}
