/**
 * GET /api/google-reviews/list
 * Returns all GBP reviews with full data (name, reply, full text) for the authenticated business.
 * Requires Pro or AI tier + Google OAuth connected.
 * Note: fetchAllReviewsFromBusinessProfile cannot be reused here — it strips name/reviewReply.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuthContext, apiError, parseTier } from '../../../lib/api-utils'
import { canAccessGoogleStats } from '../../../lib/tier-permissions'
import { refreshAccessToken, getPlaceIdFromGoogleBusinessProfile } from '../../../lib/google-business-profile'

export interface GbpFullReview {
  name: string
  reviewer: { displayName?: string; isAnonymous?: boolean }
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE' | 'STAR_RATING_UNSPECIFIED'
  comment?: string
  createTime: string
  updateTime?: string
  reviewReply?: { comment: string; updateTime: string }
}

interface GbpListReviewsResponse {
  reviews?: GbpFullReview[]
  averageRating?: number
  totalReviewCount?: number
  nextPageToken?: string
  error?: { code?: number; message?: string; status?: string }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return apiError(res, 405, 'Method not allowed')
  }

  const ctx = await getAuthContext(
    req,
    res,
    'id, business_name, tier, google_oauth_refresh_token, google_oauth_access_token, google_oauth_expires_at'
  )
  if (!ctx) return

  const { business } = ctx
  const tier = parseTier(business.tier)

  if (!canAccessGoogleStats(tier)) {
    return apiError(res, 403, 'Pro or AI tier required to access reviews')
  }

  const refreshToken = business.google_oauth_refresh_token as string | null
  if (!refreshToken) {
    return apiError(res, 400, 'Google Business Profile not connected. Connect in Settings.')
  }

  try {
    // Refresh the OAuth access token
    const { accessToken } = await refreshAccessToken(refreshToken)

    // Resolve the GBP location resource name
    const profile = await getPlaceIdFromGoogleBusinessProfile(accessToken)
    if (!profile?.locationName) {
      console.error('[GBP_DEBUG] list: could not resolve locationName from profile lookup')
      return apiError(res, 502, 'Could not resolve Google Business Profile location. Try refreshing in Settings.')
    }
    console.log('[GBP_DEBUG] list: resolved locationName:', profile.locationName)

    // Paginate through all reviews
    const allReviews: GbpFullReview[] = []
    let pageToken: string | undefined
    let averageRating = 0
    let totalReviewCount = 0

    do {
      const url = new URL(`https://mybusiness.googleapis.com/v4/${profile.locationName}/reviews`)
      url.searchParams.set('pageSize', '50')
      if (pageToken) url.searchParams.set('pageToken', pageToken)

      console.log('[GBP_DEBUG] list: requesting URL:', url.toString())

      const gbpRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data: GbpListReviewsResponse = await gbpRes.json()

      if (!gbpRes.ok || data.error) {
        console.error('[GBP_DEBUG] list: non-200 response', {
          url: url.toString(),
          status: gbpRes.status,
          errorBody: data.error ?? data,
        })
        return apiError(res, 502, data.error?.message ?? 'Failed to fetch reviews from Google')
      }

      if (data.reviews) {
        allReviews.push(...data.reviews)
      }
      averageRating = data.averageRating ?? averageRating
      totalReviewCount = data.totalReviewCount ?? allReviews.length
      pageToken = data.nextPageToken
    } while (pageToken)

    console.log('[GBP_DEBUG] list: fetched', allReviews.length, 'reviews, totalReviewCount:', totalReviewCount)

    return res.status(200).json({
      reviews: allReviews,
      totalReviewCount,
      averageRating,
    })
  } catch (err) {
    console.error('[GBP_DEBUG] list: exception', {
      message: err instanceof Error ? err.message : String(err),
    })
    return apiError(res, 500, 'Internal server error fetching reviews')
  }
}
