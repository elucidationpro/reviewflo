import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { canAccessGoogleStats } from '../../../lib/tier-permissions'
import { getPlaceIdWithCache } from '../../../lib/google-places'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/** Manual refresh of Google Business stats. Requires GOOGLE_PLACES_API_KEY and google_place_id. */
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
      .select('id, google_place_id, google_review_url, tier')
      .eq('user_id', user.id)
      .single()

    if (!business || !canAccessGoogleStats(business.tier as 'free' | 'pro' | 'ai')) {
      return res.status(403).json({ error: 'Pro or AI tier required' })
    }

    // Auto-extract Place ID from Google Review URL
    const placeId = await getPlaceIdWithCache(
      business.id,
      business.google_review_url,
      business.google_place_id,
      supabaseAdmin
    )

    if (!placeId) {
      return res.status(400).json({
        error: 'Unable to extract Place ID from your Google Review URL. Please check your URL in settings.'
      })
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) {
      return res.status(503).json({ error: 'Google Places API not configured' })
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&key=${apiKey}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' || !data.result) {
      return res.status(400).json({ error: data.error_message || 'Failed to fetch place data' })
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
