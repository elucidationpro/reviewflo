'use client'

// Browser-only analytics helpers for checkout attribution and event payloads.
// Never import Node crypto or other server-only modules here.

export type BillingInterval = 'month' | 'year'
export type PlanId = 'pro'

export interface CheckoutEventProperties {
  plan: PlanId
  billing_interval: BillingInterval
  utm_source: string | null
}

export interface FirstTouch {
  utm_source: string | null
  captured_at: string
}

export interface CheckoutAttemptContext {
  attemptId: string
  billing_interval: BillingInterval
  utm_source: string | null
}

export type CheckoutEventName = 'checkout_session_created' | 'checkout_failed' | 'checkout_canceled'

const FIRST_TOUCH_KEY = 'rf_first_touch'
const ATTEMPT_KEY = 'rf_checkout_attempt'
const EVENT_DEDUPE_PREFIX = 'rf_checkout_event_'
const MAX_UTM_LENGTH = 128
const SENSITIVE_URL_PARAM_NAMES = new Set([
  'access_token',
  'refresh_token',
  'id_token',
  'token',
  'token_hash',
  'provider_token',
  'provider_refresh_token',
  'api_key',
  'code',
  'auth',
  'password',
  'secret',
])

/** Sanitizes an arbitrary value into a bounded, control-character-free UTM string, or null. */
export function sanitizeUtmValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[\r\n\t\0]/g, '').trim()
  if (!cleaned) return null
  return cleaned.slice(0, MAX_UTM_LENGTH)
}

function redactSensitiveParams(params: URLSearchParams): void {
  for (const name of Array.from(params.keys())) {
    if (SENSITIVE_URL_PARAM_NAMES.has(name.toLowerCase())) {
      params.set(name, '[redacted]')
    }
  }
}

/**
 * Redacts sensitive query/hash params (tokens, codes, credentials) and any embedded
 * userinfo credentials, while preserving path, plain anchors, and UTM params.
 */
export function sanitizeUrlValue(raw: unknown): unknown {
  if (typeof raw !== 'string' || !raw) return raw
  const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
  let url: URL
  try {
    url = new URL(raw, 'http://placeholder.invalid')
  } catch {
    return raw
  }
  url.username = ''
  url.password = ''
  redactSensitiveParams(url.searchParams)
  // Only treat the hash as key=value params (e.g. OAuth/magic-link fragments) when it
  // actually looks like one; leave plain anchors like "#pricing" untouched.
  if (url.hash && url.hash.length > 1 && url.hash.includes('=')) {
    const hashParams = new URLSearchParams(url.hash.slice(1))
    redactSensitiveParams(hashParams)
    url.hash = hashParams.toString()
  }
  return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`
}

const URL_LIKE_KEY_PATTERN = /(url|referrer)$/i
const MAX_SANITIZE_DEPTH = 6

/** Recursively sanitizes any properties object, redacting sensitive fragments in URL-like keys. */
export function sanitizeAnalyticsProperties(value: unknown, depth = 0): unknown {
  if (depth > MAX_SANITIZE_DEPTH) return null
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAnalyticsProperties(item, depth + 1))
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (typeof val === 'string' && URL_LIKE_KEY_PATTERN.test(key)) {
        result[key] = sanitizeUrlValue(val)
      } else {
        result[key] = sanitizeAnalyticsProperties(val, depth + 1)
      }
    }
    return result
  }
  return value
}

function getStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    const storage = kind === 'session' ? window.sessionStorage : window.localStorage
    const probeKey = '__rf_storage_probe__'
    storage.setItem(probeKey, '1')
    storage.removeItem(probeKey)
    return storage
  } catch {
    return null
  }
}

/** Reads a key from storage, tolerating a probe that succeeded but a real read that throws. */
function safeGetItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

/** Writes a key to storage, tolerating a probe that succeeded but a real write that throws. */
function safeSetItem(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // storage denied mid-write; caller falls back to the in-memory value
  }
}

function parseFirstTouch(raw: string | null): FirstTouch | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && typeof parsed.captured_at === 'string') {
      return {
        // Re-sanitize on read: stored values may predate current bounds/allowed characters.
        utm_source: sanitizeUtmValue(parsed.utm_source),
        captured_at: parsed.captured_at,
      }
    }
  } catch {
    // ignore malformed stored value
  }
  return null
}

// In-memory sentinel for the current page session. Guarantees a direct (null) first visit
// can't be overwritten by a later UTM-bearing capture call within the same page load, even
// when storage is blocked (private browsing, permissions, etc.) and nothing persists.
let memoryFirstTouch: FirstTouch | null = null

/**
 * Persists first-touch attribution once, including the direct/null sentinel, so a later
 * UTM-bearing visit can never overwrite an earlier direct visit. A historical first-touch
 * source (e.g. PostHog's own initial UTM capture, which predates this helper) always beats
 * a UTM param seen on the current, later revisit.
 */
export function captureFirstTouch(
  candidateUtmSource: unknown,
  options: { historicalUtmSource?: unknown } = {}
): FirstTouch {
  if (memoryFirstTouch) return memoryFirstTouch

  const storage = getStorage('local')
  const existing = storage ? parseFirstTouch(safeGetItem(storage, FIRST_TOUCH_KEY)) : null
  if (existing) {
    memoryFirstTouch = existing
    return existing
  }

  const utm_source = sanitizeUtmValue(options.historicalUtmSource) ?? sanitizeUtmValue(candidateUtmSource) ?? null
  const firstTouch: FirstTouch = { utm_source, captured_at: new Date().toISOString() }
  if (storage) {
    safeSetItem(storage, FIRST_TOUCH_KEY, JSON.stringify(firstTouch))
  }
  memoryFirstTouch = firstTouch
  return firstTouch
}

export function getFirstTouch(): FirstTouch | null {
  if (memoryFirstTouch) return memoryFirstTouch
  const storage = getStorage('local')
  if (!storage) return null
  return parseFirstTouch(safeGetItem(storage, FIRST_TOUCH_KEY))
}

export function buildCheckoutEventProperties(
  billingInterval: BillingInterval,
  utmSourceCandidate?: unknown
): CheckoutEventProperties {
  return {
    plan: 'pro',
    billing_interval: billingInterval,
    utm_source: sanitizeUtmValue(utmSourceCandidate),
  }
}

function generateAttemptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `attempt_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

export function startCheckoutAttempt(
  billingInterval: BillingInterval,
  utmSourceCandidate?: unknown
): CheckoutAttemptContext {
  const context: CheckoutAttemptContext = {
    attemptId: generateAttemptId(),
    billing_interval: billingInterval,
    utm_source: sanitizeUtmValue(utmSourceCandidate),
  }
  const storage = getStorage('session')
  if (storage) {
    safeSetItem(storage, ATTEMPT_KEY, JSON.stringify(context))
  }
  return context
}

export function getCheckoutAttempt(): CheckoutAttemptContext | null {
  const storage = getStorage('session')
  if (!storage) return null
  const raw = safeGetItem(storage, ATTEMPT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.attemptId === 'string' &&
      (parsed.billing_interval === 'month' || parsed.billing_interval === 'year')
    ) {
      return {
        attemptId: parsed.attemptId,
        billing_interval: parsed.billing_interval,
        utm_source: sanitizeUtmValue(parsed.utm_source),
      }
    }
  } catch {
    // ignore malformed stored value
  }
  return null
}

/** Returns true the first time this (attemptId, eventName) pair is seen; false on repeats/reloads. */
export function shouldEmitCheckoutEvent(attemptId: string, eventName: CheckoutEventName): boolean {
  const storage = getStorage('session')
  if (!storage) return true
  const key = `${EVENT_DEDUPE_PREFIX}${eventName}_${attemptId}`
  try {
    if (storage.getItem(key)) return false
    storage.setItem(key, '1')
    return true
  } catch {
    return true
  }
}
