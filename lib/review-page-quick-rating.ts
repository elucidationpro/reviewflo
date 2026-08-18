/**
 * Pro/AI: one-tap "Great / Not great" first step on /{slug} instead of the 5-star picker.
 *
 * Compliance: this only changes how the FIRST tap is captured. Routing after the rating is
 * unchanged — 1-4 still lands on the private feedback form (which surfaces the Google link),
 * 5 still lands on the public review CTA. Nothing is ever hidden based on sentiment, so this
 * stays clear of the FTC Consumer Review Rule and Google's UGC policy.
 */

import { canUseQuickRating, type Tier } from '@/lib/tier-permissions'

/** A positive one-tap answer is stored as this star rating for routing/analytics consistency. */
export const QUICK_RATING_POSITIVE_VALUE = 5

/** Where a positive answer lands. */
export type QuickRatingDestination = 'platform_choice' | 'google'

/** How the star rating on a review row was captured. */
export type RatingSource = 'stars' | 'quick_positive' | 'quick_stars'

const RATING_SOURCES: RatingSource[] = ['stars', 'quick_positive', 'quick_stars']

export type QuickRatingBusiness = {
  tier?: Tier
  review_page_quick_rating_enabled?: boolean | null
  review_page_quick_rating_destination?: string | null
}

/** Optional tier override (e.g. child location row inherits account Pro/AI from primary). */
export type QuickRatingOptions = {
  accountTier?: Tier
}

/** True when /{slug} should show the one-tap step instead of the 5-star picker. */
export function shouldUseQuickRating(
  business: QuickRatingBusiness,
  options?: QuickRatingOptions
): boolean {
  const tier = options?.accountTier ?? business.tier
  if (!canUseQuickRating(tier)) return false
  return business.review_page_quick_rating_enabled === true
}

/** Unknown/NULL stored values fall back to the platform choice screen. */
export function resolveQuickRatingDestination(
  business: QuickRatingBusiness
): QuickRatingDestination {
  return business.review_page_quick_rating_destination === 'google'
    ? 'google'
    : 'platform_choice'
}

export function isRatingSource(value: unknown): value is RatingSource {
  return typeof value === 'string' && (RATING_SOURCES as string[]).includes(value)
}

export type SanitizedQuickRatingSettings = {
  enabled: boolean
  destination: QuickRatingDestination
}

export function sanitizeQuickRatingSettingsInput(input: {
  enabled?: boolean
  destination?: string | null
}): { values: SanitizedQuickRatingSettings; error: string | null } {
  const enabled = input.enabled === true
  const rawDestination = input.destination

  if (rawDestination != null && typeof rawDestination !== 'string') {
    return {
      values: { enabled, destination: 'platform_choice' },
      error: 'Destination must be text',
    }
  }
  if (
    rawDestination != null &&
    rawDestination !== 'platform_choice' &&
    rawDestination !== 'google'
  ) {
    return {
      values: { enabled, destination: 'platform_choice' },
      error: 'Destination must be platform_choice or google',
    }
  }

  return {
    values: { enabled, destination: rawDestination === 'google' ? 'google' : 'platform_choice' },
    error: null,
  }
}

/**
 * Where a 5-star / positive answer exits to. `external` skips the ReviewFlo platform screen
 * and hands the customer straight to Google (quick rating + destination=google only, and only
 * when a Google URL is actually configured).
 */
export type PositiveRatingExit =
  | { kind: 'external'; url: string }
  | { kind: 'internal'; href: string }

export function resolvePositiveRatingExit(args: {
  slug: string
  googleReviewUrl?: string | null
  quickRatingEnabled: boolean
  destination: QuickRatingDestination
  trackingToken: string | null
}): PositiveRatingExit {
  const googleUrl = args.googleReviewUrl?.trim()
  if (args.quickRatingEnabled && args.destination === 'google' && googleUrl) {
    return { kind: 'external', url: googleUrl }
  }
  const query = args.trackingToken ? `?t=${encodeURIComponent(args.trackingToken)}` : ''
  return { kind: 'internal', href: `/${args.slug}/templates${query}` }
}
