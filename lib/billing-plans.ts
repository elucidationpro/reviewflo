import type Stripe from 'stripe'

export type BillingInterval = 'month' | 'year'

/** Exact prices we sell today. Adding a plan/interval means adding an entry here. */
export const PRO_PLAN_AMOUNTS: Record<BillingInterval, number> = {
  month: 2900,
  year: 29000,
}

export function proPriceEnvVar(interval: BillingInterval): 'STRIPE_PRO_MONTHLY_PRICE_ID' | 'STRIPE_PRO_ANNUAL_PRICE_ID' {
  return interval === 'year' ? 'STRIPE_PRO_ANNUAL_PRICE_ID' : 'STRIPE_PRO_MONTHLY_PRICE_ID'
}

export function resolveProPriceId(interval: BillingInterval): string | undefined {
  const raw = process.env[proPriceEnvVar(interval)]
  const trimmed = raw?.trim()
  return trimmed || undefined
}

/** Existing callers omit `interval`; default to monthly rather than rejecting the request. */
export function parseBillingInterval(raw: unknown): BillingInterval | null {
  if (raw === undefined || raw === null || raw === '') return 'month'
  if (raw === 'month' || raw === 'year') return raw
  return null
}

export function parsePlan(raw: unknown): 'pro' | null {
  if (raw === undefined || raw === null || raw === '') return 'pro'
  if (raw === 'pro') return 'pro'
  return null
}

/**
 * Guard against a misconfigured or stale Stripe Price ID silently charging the wrong
 * amount, currency, cadence, or mode. Returns a short reason string on mismatch, else null.
 * `isLiveKey` must reflect whether the Stripe secret key used to retrieve `price` is a
 * live key — a test-mode price fetched with a live key (or vice versa) would otherwise
 * pass every other check while charging in the wrong Stripe mode entirely.
 */
export function validateProPrice(price: Stripe.Price, interval: BillingInterval, isLiveKey: boolean): string | null {
  if (!price.active) return 'price_inactive'
  if (!price.recurring) return 'price_not_recurring'
  if (price.currency !== 'usd') return 'price_currency_mismatch'
  if (price.recurring.interval !== interval) return 'price_interval_mismatch'
  if (price.recurring.interval_count !== 1) return 'price_interval_count_mismatch'
  if (price.unit_amount !== PRO_PLAN_AMOUNTS[interval]) return 'price_amount_mismatch'
  if (price.livemode !== isLiveKey) return 'price_mode_mismatch'
  return null
}
