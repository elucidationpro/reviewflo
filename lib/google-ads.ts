declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

const SIGNUP_CONVERSION_SESSION_KEY = 'rf_google_ads_signup_conversion_fired'

function getGoogleAdsConfig() {
  const conversionId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID?.trim()
  const conversionLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim()
  return { conversionId, conversionLabel }
}

function getGtag(): ((...args: unknown[]) => void) | null {
  if (typeof window === 'undefined') return null
  return typeof window.gtag === 'function' ? window.gtag : null
}

function readNewSignupFlag(
  query: Record<string, string | string[] | undefined>
): boolean {
  const raw = query.new_signup
  const values = Array.isArray(raw) ? raw : raw != null ? [raw] : []
  return values.some((v) => v === '1' || v === 'true')
}

export function fireGoogleAdsSignupConversion() {
  const { conversionId, conversionLabel } = getGoogleAdsConfig()
  const gtag = getGtag()

  if (!conversionId || !conversionLabel || !gtag) return

  gtag('event', 'conversion', {
    send_to: `${conversionId}/${conversionLabel}`,
    event_category: 'Sign-up',
    event_label: 'Sign-up',
  })
}

/**
 * Fire Google Ads signup conversion once per browser tab when `?new_signup=1` (or `true`) is present.
 * Uses sessionStorage so refresh with the same param does not double-count.
 */
export function consumeGoogleAdsSignupConversionFromQuery(
  query: Record<string, string | string[] | undefined>
): { hadNewSignupParam: boolean } {
  if (typeof window === 'undefined') {
    return { hadNewSignupParam: false }
  }

  const hadNewSignupParam = readNewSignupFlag(query)
  if (!hadNewSignupParam) {
    return { hadNewSignupParam: false }
  }

  if (sessionStorage.getItem(SIGNUP_CONVERSION_SESSION_KEY) !== '1') {
    fireGoogleAdsSignupConversion()
    sessionStorage.setItem(SIGNUP_CONVERSION_SESSION_KEY, '1')
  }

  return { hadNewSignupParam: true }
}
