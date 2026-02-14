import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../lib/adminAuth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user || !isAdminUser(user)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const { data: rows, error } = await supabaseAdmin
      .from('early_access_signups')
      .select('id, user_id, email, full_name, business_type, customers_per_month, review_asking_frequency, stripe_session_id, access_start_date, access_end_date, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching early access signups:', error)
      return res.status(500).json({ error: 'Failed to fetch early access signups' })
    }

    return res.status(200).json({
      earlyAccessSignups: rows || [],
    })
  } catch (err) {
    console.error('Error in get-early-access API:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
