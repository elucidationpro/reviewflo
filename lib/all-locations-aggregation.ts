import type { GbpFullReview } from '@/pages/api/google-reviews/list'

// GbpFullReview extended with the source location's id and name.
export interface GbpReviewWithLocation extends GbpFullReview {
  _businessId: string
  _locationName: string
}

export interface GbpStatsSlice {
  total_reviews: number | null
  average_rating: number | null
  reviews_this_month: number | null
}

/**
 * Merge GBP stats from multiple locations.
 * - total_reviews: sum
 * - reviews_this_month: sum
 * - average_rating: weighted average (weighted by total_reviews), null if no location has data
 */
export function aggregateGbpStats(slices: GbpStatsSlice[]): GbpStatsSlice {
  const valid = slices.filter((s) => s.total_reviews != null)
  if (valid.length === 0) return { total_reviews: null, average_rating: null, reviews_this_month: null }

  const totalReviews = valid.reduce((sum, s) => sum + (s.total_reviews ?? 0), 0)
  const reviewsThisMonth = slices.reduce((sum, s) => sum + (s.reviews_this_month ?? 0), 0)

  // Weighted average rating
  let weightedSum = 0
  let weightTotal = 0
  for (const s of valid) {
    if (s.average_rating != null && s.total_reviews != null && s.total_reviews > 0) {
      weightedSum += s.average_rating * s.total_reviews
      weightTotal += s.total_reviews
    }
  }
  const average_rating = weightTotal > 0 ? weightedSum / weightTotal : null

  return { total_reviews: totalReviews, average_rating, reviews_this_month: reviewsThisMonth }
}

/**
 * Merge reviews from multiple locations into a single sorted list.
 * Each review gets _businessId and _locationName so the UI can:
 *   a) show a location badge
 *   b) send the correct businessId when replying
 */
export function mergeReviews(
  byLocation: Array<{ businessId: string; locationName: string; reviews: GbpFullReview[] }>
): GbpReviewWithLocation[] {
  const merged: GbpReviewWithLocation[] = []
  for (const { businessId, locationName, reviews } of byLocation) {
    for (const r of reviews) {
      merged.push({ ...r, _businessId: businessId, _locationName: locationName })
    }
  }
  // Sort by createTime descending (most recent first)
  merged.sort((a, b) => {
    const ta = a.createTime ? new Date(a.createTime).getTime() : 0
    const tb = b.createTime ? new Date(b.createTime).getTime() : 0
    return tb - ta
  })
  return merged
}
