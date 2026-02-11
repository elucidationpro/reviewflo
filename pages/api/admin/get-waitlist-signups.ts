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
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user || !isAdminUser(user)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    // Fetch waitlist signups
    const { data: waitlistSignups, error: waitlistError } = await supabaseAdmin
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false })

    if (waitlistError) {
      console.error('Error fetching waitlist signups:', waitlistError)
      return res.status(500).json({ error: 'Failed to fetch waitlist signups' })
    }

    return res.status(200).json({
      waitlistSignups: waitlistSignups || [],
    })
  } catch (error) {
    console.error('Error in get-waitlist-signups API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
