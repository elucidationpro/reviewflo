import { createHash } from 'crypto'

// Server-only best-effort PostHog capture for post-checkout events. Never imported by
// browser code; must never throw on network failure so it can't break checkout/webhook flows.

export type BillingInterval = 'month' | 'year'

export interface ServerCheckoutEventProperties {
  plan: 'pro'
  billing_interval: BillingInterval
  utm_source: string | null
  [key: string]: unknown
}

export interface ServerCheckoutEvent {
  eventName: 'checkout_completed' | 'checkout_failed'
  /** Trusted server-resolved owner id (e.g. Supabase user id), supplied by the caller. */
  distinctId: string
  /** Stable id for replay-safe dedupe, e.g. from deterministicEventId(). */
  eventId: string
  /** Stable ISO timestamp for replay-safe dedupe, e.g. from deterministicEventTimestamp(). */
  timestamp: string
  properties: ServerCheckoutEventProperties
}

const CAPTURE_TIMEOUT_MS = 2000

/** Normalizes PostHog cloud hosts to their ingestion-only subdomains. */
export function normalizePostHogHost(host: string): string {
  try {
    const url = new URL(host)
    if (url.hostname === 'us.posthog.com') url.hostname = 'us.i.posthog.com'
    else if (url.hostname === 'eu.posthog.com') url.hostname = 'eu.i.posthog.com'
    return url.toString().replace(/\/+$/, '')
  } catch {
    return host
  }
}

/** Deterministic UUID-shaped id derived from stable inputs, for idempotent replay dedupe. */
export function deterministicEventId(parts: string[]): string {
  const hash = createHash('sha256').update(parts.join('|')).digest('hex')
  const variantNibble = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16)
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `${variantNibble}${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-')
}

/** Truncates a seed timestamp to whole seconds so replays produce an identical value. */
export function deterministicEventTimestamp(seedIso: string): string {
  const date = new Date(seedIso)
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString()
  date.setMilliseconds(0)
  return date.toISOString()
}

export interface CheckoutCompletedFromSession {
  /** Stripe Checkout Session id — combined with `created` for replay-safe dedupe. */
  sessionId: string
  /** Session's own `created` (unix seconds), NOT the webhook event timestamp or current time. */
  created: number
  distinctId: string
  billingInterval: BillingInterval
  utmSource: string | null
}

/**
 * Reusable authoritative `checkout_completed` capture, shared by the webhook and the (separately
 * owned) confirmation-refresh verification endpoint. Callers must only invoke this after a
 * successful, non-ignored/non-downgraded Pro sync — this helper does not itself check sync state.
 */
export async function captureCheckoutCompletedFromSession(data: CheckoutCompletedFromSession): Promise<void> {
  const timestamp = deterministicEventTimestamp(new Date(data.created * 1000).toISOString())
  const eventId = deterministicEventId(['checkout_completed', data.sessionId])
  await captureServerCheckoutEvent({
    eventName: 'checkout_completed',
    distinctId: data.distinctId,
    eventId,
    timestamp,
    properties: { plan: 'pro', billing_interval: data.billingInterval, utm_source: data.utmSource },
  })
}

export interface CheckoutFailedFromStripeEvent {
  /** Stripe event id — combined with a fixed prefix for replay-safe dedupe. */
  stripeEventId: string
  /** The webhook event's own `created` (unix seconds), for a stable replay timestamp. */
  eventCreated: number
  distinctId: string
  billingInterval: BillingInterval
  utmSource: string | null
  reason: string
}

/** Reusable `checkout_failed` capture for server-detected failures (e.g. invoice.payment_failed). */
export async function captureCheckoutFailedEvent(data: CheckoutFailedFromStripeEvent): Promise<void> {
  const timestamp = deterministicEventTimestamp(new Date(data.eventCreated * 1000).toISOString())
  const eventId = deterministicEventId(['checkout_failed', data.stripeEventId])
  await captureServerCheckoutEvent({
    eventName: 'checkout_failed',
    distinctId: data.distinctId,
    eventId,
    timestamp,
    properties: {
      plan: 'pro',
      billing_interval: data.billingInterval,
      utm_source: data.utmSource,
      reason: data.reason,
    },
  })
}

/** Fires a server-side PostHog capture event. Best effort: never throws, bounded by a timeout. */
export async function captureServerCheckoutEvent(event: ServerCheckoutEvent): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!apiKey || !host) return

  let endpoint: string
  try {
    endpoint = `${normalizePostHogHost(host)}/i/v0/e/`
  } catch {
    return
  }

  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS)
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event: event.eventName,
        distinct_id: event.distinctId,
        uuid: event.eventId,
        timestamp: event.timestamp,
        properties: event.properties,
      }),
      signal: controller.signal,
    })
  } catch {
    // Network/timeout failures must never surface to callers.
  } finally {
    clearTimeout(timeoutHandle)
  }
}
