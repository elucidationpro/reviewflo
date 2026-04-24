import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getBusinessForRequest } from '../../../lib/business-account'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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
      'id'
    )
    if (!businessRow) {
      return res.status(lookupErr === 'not found' ? 403 : 404).json({ error: 'Business not found' })
    }
    const business = businessRow as { id: string }

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const iso = startOfMonth.toISOString()

    const { data: monthRequests } = await supabaseAdmin
      .from('review_requests')
      .select('status')
      .eq('business_id', business.id)
      .gte('sent_at', iso)

    const sent = monthRequests?.length ?? 0
    const opened = monthRequests?.filter((r) =>
      ['opened', 'clicked', 'completed', 'feedback'].includes(r.status)
    ).length ?? 0
    const completed = monthRequests?.filter((r) =>
      ['completed', 'feedback'].includes(r.status)
    ).length ?? 0
    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0
    const completionRate = sent > 0 ? Math.round((completed / sent) * 100) : 0

    return res.status(200).json({
      sent,
      opened,
      completed,
      openRate,
      completionRate,
    })
  } catch (error) {
    console.error('[review-requests/stats] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
