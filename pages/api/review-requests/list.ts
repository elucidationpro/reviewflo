import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PAGE_SIZE = 20

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

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10))
    const status = req.query.status as string | undefined
    const search = (req.query.search as string)?.trim().toLowerCase()
    const offset = (page - 1) * PAGE_SIZE

    let query = supabaseAdmin
      .from('review_requests')
      .select('*', { count: 'exact' })
      .eq('business_id', business.id)
      .order('sent_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)

    if (status && ['pending', 'opened', 'clicked', 'completed', 'feedback'].includes(status)) {
      query = query.eq('status', status)
    }

    if (search) {
      const safe = search.replace(/%/g, '\\%').replace(/'/g, "''")
      query = query.or(
        `customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%`
      )
    }

    const { data: requests, error, count } = await query

    if (error) {
      console.error('[review-requests/list] Error:', error)
      return res.status(500).json({ error: 'Failed to fetch requests' })
    }

    return res.status(200).json({
      requests: requests || [],
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    })
  } catch (error) {
    console.error('[review-requests/list] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
