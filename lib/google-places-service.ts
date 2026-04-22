/**
 * Google Places API service helpers for the automated tracking cron job.
 * Handles fetching place details (rating, review count) and recent reviews.
 */

export interface PlaceStats {
  totalReviews: number
  averageRating: number
  source: 'places_api'
}

export interface PlaceReview {
  author: string
  rating: number
  text: string
  time: number // Unix seconds
}

interface PlaceDetailsResponse {
  status: string
  result?: {
    place_id?: string
    rating?: number
    user_ratings_total?: number
    reviews?: Array<{
      author_name?: string
      rating?: number
      text?: string
      time?: number
    }>
  }
  error_message?: string
}

/**
 * Fetch place stats (rating + review count) from Google Places API.
 * Returns null on any error — cron will log and move on.
 */
export async function fetchPlaceStats(placeId: string): Promise<PlaceStats | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('[google-places-service] GOOGLE_PLACES_API_KEY not configured')
    return null
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=rating,user_ratings_total&key=${apiKey}`
    const res = await fetch(url)
    const data: PlaceDetailsResponse = await res.json()

    if (data.status !== 'OK' || !data.result) {
      console.warn('[google-places-service] fetchPlaceStats failed:', {
        placeId,
        status: data.status,
        error: data.error_message,
      })
      return null
    }

    return {
      totalReviews: data.result.user_ratings_total ?? 0,
      averageRating: data.result.rating ?? 0,
      source: 'places_api',
    }
  } catch (err) {
    console.error('[google-places-service] fetchPlaceStats error:', err)
    return null
  }
}

/**
 * Fetch recent reviews (up to 5, Google Places limit) for a place.
 * Returns empty array on error.
 */
export async function fetchPlaceReviews(placeId: string): Promise<PlaceReview[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('[google-places-service] GOOGLE_PLACES_API_KEY not configured')
    return []
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=reviews&key=${apiKey}`
    const res = await fetch(url)
    const data: PlaceDetailsResponse = await res.json()

    if (data.status !== 'OK' || !data.result?.reviews) {
      return []
    }

    return data.result.reviews.map((r) => ({
      author: r.author_name || 'Anonymous',
      rating: r.rating ?? 0,
      text: (r.text || '').slice(0, 500),
      time: r.time ?? 0,
    }))
  } catch (err) {
    console.error('[google-places-service] fetchPlaceReviews error:', err)
    return []
  }
}

/**
 * Resolve a stale/deprecated Place ID to its current canonical ID.
 * First tries Place Details with field=place_id (Google returns the new canonical
 * ID even for deprecated IDs). Falls back to a text search on the business name.
 */
async function resolveCanonicalPlaceId(staleId: string, businessName: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(staleId)}&fields=place_id&key=${apiKey}`
    )
    const data: { status: string; result?: { place_id?: string } } = await res.json()
    if (data.status === 'OK' && data.result?.place_id) return data.result.place_id
  } catch (err) {
    console.warn('[google-places-service] resolveCanonicalPlaceId details lookup failed:', err)
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(businessName)}&key=${apiKey}`
    )
    const data: { status: string; results?: Array<{ place_id?: string }> } = await res.json()
    if (data.status === 'OK' && data.results?.[0]?.place_id) return data.results[0].place_id
  } catch (err) {
    console.warn('[google-places-service] resolveCanonicalPlaceId text search fallback failed:', err)
  }

  return null
}

export interface PlaceStatsWithRefresh {
  stats: PlaceStats | null
  refreshedPlaceId?: string
}

/**
 * Like fetchPlaceStats but also handles stale Place IDs.
 * On NOT_FOUND / INVALID_REQUEST, resolves a canonical ID and retries.
 * Returns refreshedPlaceId when the stored ID changed — caller must persist it.
 */
export async function fetchPlaceStatsWithRefresh(
  placeId: string,
  businessName: string
): Promise<PlaceStatsWithRefresh> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    console.error('[google-places-service] GOOGLE_PLACES_API_KEY not configured')
    return { stats: null }
  }

  try {
    // Include place_id field so we can detect canonical ID swaps in the OK path
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=place_id,rating,user_ratings_total&key=${apiKey}`
    )
    const data: PlaceDetailsResponse = await res.json()

    if (data.status === 'OK' && data.result) {
      const stats: PlaceStats = {
        totalReviews: data.result.user_ratings_total ?? 0,
        averageRating: data.result.rating ?? 0,
        source: 'places_api',
      }
      if (data.result.place_id && data.result.place_id !== placeId) {
        // GBP_DEBUG
        console.log('[GBP_DEBUG] place_id refreshed (canonical swap):', `${placeId} -> ${data.result.place_id}`)
        return { stats, refreshedPlaceId: data.result.place_id }
      }
      return { stats }
    }

    if (data.status === 'NOT_FOUND' || data.status === 'INVALID_REQUEST') {
      console.warn('[google-places-service] Stale place_id detected, attempting resolution:', placeId)
      const newId = await resolveCanonicalPlaceId(placeId, businessName)
      if (newId && newId !== placeId) {
        // GBP_DEBUG
        console.log('[GBP_DEBUG] place_id refreshed (via resolution):', `${placeId} -> ${newId}`)
        const stats = await fetchPlaceStats(newId)
        return { stats, refreshedPlaceId: newId }
      }
      console.warn('[google-places-service] Could not resolve stale place_id:', placeId)
      return { stats: null }
    }

    console.warn('[google-places-service] fetchPlaceStatsWithRefresh unexpected status:', {
      placeId,
      status: data.status,
      error: data.error_message,
    })
    return { stats: null }
  } catch (err) {
    console.error('[google-places-service] fetchPlaceStatsWithRefresh error:', err)
    return { stats: null }
  }
}

/**
 * Fetch stats via GBP OAuth (returns ALL reviews, not capped at 5).
 * Falls back to Places API if OAuth not available or fails.
 */
export interface GBPStats {
  totalReviews: number
  averageRating: number
  source: 'business_profile' | 'places_api'
}

export async function fetchStatsWithOAuth(
  refreshToken: string,
  placeIdFallback: string | null,
  businessName?: string
): Promise<(GBPStats & { refreshedPlaceId?: string }) | null> {
  try {
    const { refreshAccessToken, fetchAllReviewsFromBusinessProfile } = await import('./google-business-profile')
    const tokens = await refreshAccessToken(refreshToken)
    const result = await fetchAllReviewsFromBusinessProfile(tokens.accessToken)

    if (result) {
      return {
        totalReviews: result.totalReviewCount,
        averageRating: result.averageRating,
        source: 'business_profile',
      }
    }

    // GBP_DEBUG
    console.error('[GBP_DEBUG] fetchStatsWithOAuth: GBP reviews call returned null (token refresh succeeded, reviews call failed or returned empty)');
  } catch (err) {
    // GBP_DEBUG
    console.error('[GBP_DEBUG] fetchStatsWithOAuth exception:', {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  // Fallback to Places API — use refresh-aware fetch when business name is available
  if (placeIdFallback) {
    if (businessName) {
      const { stats, refreshedPlaceId } = await fetchPlaceStatsWithRefresh(placeIdFallback, businessName)
      if (stats) return { ...stats, refreshedPlaceId }
    } else {
      const stats = await fetchPlaceStats(placeIdFallback)
      if (stats) return { ...stats, source: 'places_api' }
    }
  }

  return null
}

/**
 * Simple rate limiting helper: sleep for ms milliseconds.
 * Used between API calls in the cron to avoid hitting rate limits.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate week-over-week and month-over-month deltas from snapshot history.
 * Pass the current total_reviews and average_rating, plus sorted snapshots
 * (most recent first) to compare against.
 */
export function calculateDeltas(
  currentReviews: number,
  currentRating: number,
  snapshots: Array<{ snapshot_date: string; total_reviews: number; average_rating: number }>
): {
  reviewsThisWeek: number
  reviewsThisMonth: number
  ratingChangeWeek: number
  ratingChangeMonth: number
} {
  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Find the snapshot closest to 7 days ago
  const weekSnap = snapshots.find(
    (s) => new Date(s.snapshot_date) <= sevenDaysAgo
  )
  // Find the snapshot closest to 30 days ago
  const monthSnap = snapshots.find(
    (s) => new Date(s.snapshot_date) <= thirtyDaysAgo
  )

  return {
    reviewsThisWeek: weekSnap ? currentReviews - weekSnap.total_reviews : 0,
    reviewsThisMonth: monthSnap ? currentReviews - monthSnap.total_reviews : 0,
    ratingChangeWeek: weekSnap
      ? parseFloat((currentRating - weekSnap.average_rating).toFixed(2))
      : 0,
    ratingChangeMonth: monthSnap
      ? parseFloat((currentRating - monthSnap.average_rating).toFixed(2))
      : 0,
  }
}
