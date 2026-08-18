/**
 * Customer-facing /{slug} star screen: headline and subtext.
 * NULL or empty stored values resolve to product defaults.
 */

export const DEFAULT_REVIEW_PAGE_HEADLINE = 'How was your experience?'
export const DEFAULT_REVIEW_PAGE_SUBTEXT = 'Tap a star to rate'
/** "Tap a star" is wrong when the one-tap Great/Not great step is on. */
export const DEFAULT_QUICK_RATING_SUBTEXT = 'One tap is all it takes'

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

export type ResolveReviewPageCopyOptions = {
  /** True when the one-tap Great/Not great step replaces the 5-star picker. */
  quickRating?: boolean
}

/**
 * Resolved copy for customer-facing pages (custom when set, else defaults).
 *
 * Subtext is a caption for the control directly above it, so a stored value written for
 * the 5-star picker ("Tap a star to rate…") is wrong once one-tap is on — there are no
 * stars to tap. In quick mode the stored subtext is therefore ignored in favor of the
 * one-tap default. Headline is control-agnostic and stays customizable in both modes.
 */
export function resolveReviewPageCopy(
  business: ReviewPageCopyBusiness,
  options?: ResolveReviewPageCopyOptions
): ResolvedReviewPageCopy {
  const headline =
    normalizeStoredCopy(business.review_page_headline) ?? DEFAULT_REVIEW_PAGE_HEADLINE

  if (options?.quickRating) {
    return { headline, subtext: DEFAULT_QUICK_RATING_SUBTEXT }
  }

  return {
    headline,
    subtext: normalizeStoredCopy(business.review_page_subtext) ?? DEFAULT_REVIEW_PAGE_SUBTEXT,
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
