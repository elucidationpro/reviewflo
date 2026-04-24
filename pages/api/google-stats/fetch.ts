import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getPlaceIdWithCache } from '../../../lib/google-places'
import { getBusinessForRequest } from '../../../lib/business-account'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/** Fetch Google Business stats - placeholder. Add Google Places API key to enable. */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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

    const businessId = typeof req.query.businessId === 'string' ? req.query.businessId : null
    const { row: businessRow, error: lookupErr } = await getBusinessForRequest(
      supabaseAdmin,
      user.id,
      businessId,
      'id, google_place_id, google_review_url'
    )
    if (!businessRow) {
      return res.status(lookupErr === 'not found' ? 403 : 404).json({ error: 'Business not found' })
    }
    const business = businessRow as { id: string; google_place_id: string | null; google_review_url: string | null }

    // Try to get Place ID (either cached or extracted from review URL)
    const placeId = await getPlaceIdWithCache(
      business.id,
      business.google_review_url,
      business.google_place_id,
      supabaseAdmin
    )

    // Return cached stats if available
    const { data: stats } = await supabaseAdmin
      .from('google_business_stats')
      .select('*')
      .eq('business_id', business.id)
      .single()

    // GBP_DEBUG
    console.log('[GBP_DEBUG] google-stats/fetch cached row:', {
      business_id: business.id,
      found: !!stats,
      total_reviews: stats?.total_reviews ?? null,
      average_rating: stats?.average_rating ?? null,
      last_fetched: stats?.last_fetched ?? null,
    })

    return res.status(200).json({
      stats: stats || null,
      hasPlaceId: !!placeId,
    })
  } catch (error) {
    console.error('[google-stats/fetch] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
