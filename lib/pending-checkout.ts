/**
 * Records that a Stripe Checkout session still needs confirmation across a sign-in that
 * drops query params (Google login / magic link always land on a fixed destination, never
 * `?redirect=`). Only a validated `cs_...` Checkout Session id is ever stored — never an
 * arbitrary redirect URL or token — so a stale/forged sessionStorage value can at most name a
 * Checkout Session id, which the server-side verify endpoint independently re-checks for
 * ownership before revealing or acting on anything.
 */

const STORAGE_KEY = 'reviewflo.pendingCheckoutSessionId'

export function isValidCheckoutSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^cs_[a-zA-Z0-9_]{10,255}$/.test(value)
}

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    // Storage access can throw (privacy mode, disabled storage) — treat as unavailable.
    return null
  }
}

export function savePendingCheckoutSessionId(sessionId: string): boolean {
  if (!isValidCheckoutSessionId(sessionId)) return false
  const s = storage()
  if (!s) return false
  try {
    s.setItem(STORAGE_KEY, sessionId)
    return true
  } catch {
    // ignore storage write failures
    return false
  }
}

export function readPendingCheckoutSessionId(): string | null {
  const s = storage()
  if (!s) return null
  try {
    const value = s.getItem(STORAGE_KEY)
    return isValidCheckoutSessionId(value) ? value : null
  } catch {
    return null
  }
}

export function clearPendingCheckoutSessionId(): void {
  const s = storage()
  if (!s) return
  try {
    s.removeItem(STORAGE_KEY)
  } catch {
    // ignore storage write failures
  }
}

export function loginRedirectTarget(sessionId: string): string {
  return `/login?redirect=${encodeURIComponent(`/dashboard/checkout?session_id=${sessionId}`)}`
}

export function resolvePlanLabel(plan: string): string {
  return plan === 'ai' ? 'AI' : 'Pro'
}
