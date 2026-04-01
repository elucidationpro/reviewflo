import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { canAccessGoogleStats } from '../../../lib/tier-permissions'
import { getPlaceIdWithCache, extractPlaceIdFromReviewUrl } from '../../../lib/google-places'
import {
  refreshAccessToken,
  getPlaceIdFromGoogleBusinessProfile,
  fetchAllReviewsFromBusinessProfile,
} from '../../../lib/google-business-profile'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PLACE_ID_INVALID =
  /Place ID.*no longer valid|refresh cached Place ID|INVALID_REQUEST|NOT_FOUND/i

async function fetchPlaceDetails(placeId: string) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return { status: 'ERROR', error: 'Google Places API not configured' }
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&key=${apiKey}`
  )
  return res.json()
}

/** Manual refresh of Google Business stats. Requires GOOGLE_PLACES_API_KEY. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, google_place_id, google_review_url, tier, google_oauth_refresh_token, google_oauth_access_token, google_oauth_expires_at')
      .eq('user_id', user.id)
      .single()

    if (!business || !canAccessGoogleStats(business.tier as 'free' | 'pro' | 'ai')) {
      return res.status(403).json({ error: 'Pro or AI tier required' })
    }

    // Try Google Business Profile API first (returns ALL reviews) when OAuth is connected
    if (business.google_oauth_refresh_token) {
      try {
        const tokens = await refreshAccessToken(business.google_oauth_refresh_token)
        const gbpResult = await fetchAllReviewsFromBusinessProfile(tokens.accessToken)
        if (gbpResult && gbpResult.reviews.length > 0) {
          // Update tokens in DB
          await supabaseAdmin
            .from('businesses')
            .update({
              google_oauth_access_token: tokens.accessToken,
              google_oauth_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
            })
            .eq('id', business.id)

          const { error: upsertError } = await supabaseAdmin
            .from('google_business_stats')
            .upsert(
              {
                business_id: business.id,
                total_reviews: gbpResult.totalReviewCount,
                average_rating: gbpResult.averageRating,
                recent_reviews: gbpResult.reviews,
                reviews_this_month: null,
                last_fetched: new Date().toISOString(),
              },
              { onConflict: 'business_id' }
            )

          if (!upsertError) {
            return res.status(200).json({
              success: true,
              total_reviews: gbpResult.totalReviewCount,
              average_rating: gbpResult.averageRating,
              source: 'business_profile',
            })
          }
        }
      } catch (e) {
        console.warn('[google-stats/refresh] GBP API failed, falling back to Places:', e)
      }
    }

    // Fallback: Places API (max 5 reviews) when no OAuth or GBP failed
    let placeId = await getPlaceIdWithCache(
      business.id,
      business.google_review_url,
      business.google_place_id,
      supabaseAdmin
    )

    if (!placeId) {
      return res.status(400).json({
        error: 'Add your Google Review URL in Settings, or connect Google Business Profile, then try again.'
      })
    }

    let data = await fetchPlaceDetails(placeId)

    if (data.status !== 'OK' || !data.result) {
      const errMsg = data.error_message || data.status || 'Failed to fetch place data'
      console.warn('[google-stats/refresh] Places API error for place_id', placeId, ':', data.status, errMsg)

      // For service-area businesses or other lookup failures: do NOT clear the cached
      // Place ID and do NOT fall back to URL-based resolution (which can resolve to a
      // different business via CID). Just surface the error so the user knows to
      // connect Google Business Profile API instead.
      return res.status(400).json({
        error: 'Unable to fetch Google stats via Places API. This business may not be indexed (e.g. service-area business). Connect Google Business Profile for full stats.',
        status: data.status,
      })
    }

    const result = data.result
    const reviews = result.reviews || []
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const recentReviews = reviews.slice(0, 5).map((r: { author_name?: string; rating?: number; text?: string; time?: number }) => ({
      author: r.author_name,
      rating: r.rating,
      text: (r.text || '').slice(0, 200),
      time: r.time,
    }))

    const { error: upsertError } = await supabaseAdmin
      .from('google_business_stats')
      .upsert(
        {
          business_id: business.id,
          total_reviews: result.user_ratings_total ?? 0,
          average_rating: result.rating ?? 0,
          recent_reviews: recentReviews,
          reviews_this_month: null,
          last_fetched: new Date().toISOString(),
        },
        { onConflict: 'business_id' }
      )

    if (upsertError) {
      console.error('[google-stats/refresh] Upsert error:', upsertError)
      return res.status(500).json({ error: 'Failed to save stats' })
    }

    return res.status(200).json({
      success: true,
      total_reviews: result.user_ratings_total,
      average_rating: result.rating,
    })
  } catch (error) {
    console.error('[google-stats/refresh] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
