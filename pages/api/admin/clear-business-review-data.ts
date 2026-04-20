/**
 * POST /api/admin/clear-business-review-data
 * Deletes customer analytics rows for one business (reviews, feedback, review_requests).
 * Does not delete the business account or owner auth.
 *
 * Body: { "slug": "obsidian-auto" } or { "businessId": "uuid" }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../lib/adminAuth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    if (authError || !user || !isAdminUser(user)) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : ''
    const businessIdRaw = typeof req.body?.businessId === 'string' ? req.body.businessId.trim() : ''

    let businessId = businessIdRaw
    if (!businessId && slug) {
      const { data: biz, error: bizErr } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (bizErr || !biz?.id) {
        return res.status(404).json({ error: 'Business not found for slug' })
      }
      businessId = biz.id
    }

    if (!businessId) {
      return res.status(400).json({ error: 'Provide slug or businessId' })
    }

    const { count: rrBefore } = await supabaseAdmin
      .from('review_requests')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId)

    const { error: e1 } = await supabaseAdmin.from('review_requests').delete().eq('business_id', businessId)
    if (e1) {
      console.error('[clear-business-review-data] review_requests', e1)
      return res.status(500).json({ error: 'Failed to delete review_requests' })
    }

    const { error: e2 } = await supabaseAdmin.from('reviews').delete().eq('business_id', businessId)
    if (e2) {
      console.error('[clear-business-review-data] reviews', e2)
      return res.status(500).json({ error: 'Failed to delete reviews' })
    }

    const { error: e3 } = await supabaseAdmin.from('feedback').delete().eq('business_id', businessId)
    if (e3) {
      console.error('[clear-business-review-data] feedback', e3)
      return res.status(500).json({ error: 'Failed to delete feedback' })
    }

    return res.status(200).json({
      ok: true,
      businessId,
      slug: slug || null,
      deletedReviewRequests: rrBefore ?? 0,
      message: 'Removed review_requests, reviews, and feedback for this business. PostHog events are unchanged.',
    })
  } catch (err) {
    console.error('[clear-business-review-data]', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
