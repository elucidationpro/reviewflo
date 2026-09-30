import { SITE_ORIGIN } from './seo'

function isLiveSecretKey(secretKey: string): boolean {
  return secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_')
}

function isTestSecretKey(secretKey: string): boolean {
  return secretKey.startsWith('sk_test_') || secretKey.startsWith('rk_test_')
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * Absolute http(s) origin with no credentials/query/hash/path, trailing slash stripped.
 * Returns null if invalid. `http:` is only accepted for local dev hosts; any other host must
 * use `https:` so the override can never be used to redirect a completed checkout to a
 * plaintext, spoofable origin.
 */
function normalizeBaseUrl(raw: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (parsed.username || parsed.password) return null
  if (parsed.search || parsed.hash) return null
  if (parsed.pathname !== '/' && parsed.pathname !== '') return null
  if (parsed.protocol === 'http:' && !LOCAL_HOSTNAMES.has(parsed.hostname)) return null
  return `${parsed.protocol}//${parsed.host}`
}

/**
 * Resolve the base origin used to build Stripe Checkout success/cancel URLs.
 *
 * Never trust the incoming request's `Origin` header — it is attacker-controlled and would let
 * a caller redirect a completed checkout anywhere. Live Stripe keys and Vercel Production always
 * use the canonical `www` host. Only non-production requests authenticated with an actual
 * test-mode secret key (`sk_test_`/`rk_test_`) may use an explicitly configured
 * `CHECKOUT_BASE_URL` override (e.g. localhost or a preview deployment), and only if it is a
 * well-formed absolute http(s) origin with no credentials or path.
 */
export function resolveCheckoutBaseUrl(secretKey: string): string {
  const isProduction = process.env.VERCEL_ENV === 'production'
  if (isProduction || isLiveSecretKey(secretKey)) {
    return SITE_ORIGIN
  }

  if (!isTestSecretKey(secretKey)) {
    return SITE_ORIGIN
  }

  const override = process.env.CHECKOUT_BASE_URL?.trim()
  if (override) {
    const normalized = normalizeBaseUrl(override)
    if (normalized) return normalized
  }

  return SITE_ORIGIN
}
