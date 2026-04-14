/**
 * Customer-facing review pages: accent color and footer (ReviewFlo vs white-label).
 */

export type ReviewFloWhiteLabel = {
  brandName: string
  brandColor?: string | null
}

export function getReviewAccentColor(business: {
  primary_color: string
  white_label_enabled?: boolean | null
  custom_brand_color?: string | null
}): string {
  if (business.white_label_enabled && business.custom_brand_color?.trim()) {
    return business.custom_brand_color.trim()
  }
  return business.primary_color
}

export type ResolvedReviewFooter = {
  whiteLabel: ReviewFloWhiteLabel | null
  showReviewFloBranding: boolean
}

export function resolvePublicReviewFooter(business: {
  tier?: string | null
  show_reviewflo_branding?: boolean | null
  white_label_enabled?: boolean | null
  custom_brand_name?: string | null
  custom_brand_color?: string | null
  business_name?: string | null
}): ResolvedReviewFooter {
  const wlOn = business.white_label_enabled === true
  const fallbackName = (business.business_name ?? '').trim()
  const customName = (business.custom_brand_name ?? '').trim()
  const displayName = customName || fallbackName

  if (wlOn && displayName) {
    return {
      whiteLabel: {
        brandName: displayName,
        brandColor: business.custom_brand_color?.trim() || null,
      },
      showReviewFloBranding: false,
    }
  }

  return {
    whiteLabel: null,
    showReviewFloBranding:
      business.show_reviewflo_branding !== false || business.tier === 'free',
  }
}
