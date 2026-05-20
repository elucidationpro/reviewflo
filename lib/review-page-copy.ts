/**
 * Customer-facing /{slug} star screen: headline and subtext.
 * NULL or empty stored values resolve to product defaults.
 */

export const DEFAULT_REVIEW_PAGE_HEADLINE = 'How was your experience?'
export const DEFAULT_REVIEW_PAGE_SUBTEXT = 'Tap a star to rate'

export const MAX_REVIEW_PAGE_HEADLINE = 120
export const MAX_REVIEW_PAGE_SUBTEXT = 80

export type ReviewPageCopyBusiness = {
  review_page_headline?: string | null
  review_page_subtext?: string | null
}

export type ResolvedReviewPageCopy = {
  headline: string
  subtext: string
}

export type SanitizedReviewPageCopy = {
  headline: string | null
  subtext: string | null
}

function normalizeStoredCopy(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Resolved copy for customer-facing pages (custom when set, else defaults). */
export function resolveReviewPageCopy(
  business: ReviewPageCopyBusiness
): ResolvedReviewPageCopy {
  return {
    headline:
      normalizeStoredCopy(business.review_page_headline) ??
      DEFAULT_REVIEW_PAGE_HEADLINE,
    subtext:
      normalizeStoredCopy(business.review_page_subtext) ??
      DEFAULT_REVIEW_PAGE_SUBTEXT,
  }
}

/**
 * Trim and normalize for DB persistence. Whitespace-only becomes null.
 * Rejects non-strings and values over max length (for API 400 responses).
 */
export function sanitizeReviewPageCopyInput(
  headline?: string | null,
  subtext?: string | null
): { values: SanitizedReviewPageCopy; error: string | null } {
  const values: SanitizedReviewPageCopy = {
    headline: normalizeStoredCopy(headline),
    subtext: normalizeStoredCopy(subtext),
  }

  if (headline != null && typeof headline !== 'string') {
    return { values, error: 'Headline must be text' }
  }
  if (subtext != null && typeof subtext !== 'string') {
    return { values, error: 'Subtext must be text' }
  }

  if (values.headline && values.headline.length > MAX_REVIEW_PAGE_HEADLINE) {
    return {
      values,
      error: `Headline must be at most ${MAX_REVIEW_PAGE_HEADLINE} characters`,
    }
  }
  if (values.subtext && values.subtext.length > MAX_REVIEW_PAGE_SUBTEXT) {
    return {
      values,
      error: `Subtext must be at most ${MAX_REVIEW_PAGE_SUBTEXT} characters`,
    }
  }

  return { values, error: null }
}
