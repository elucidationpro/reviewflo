import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../lib/adminAuth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type Tier = 'free' | 'pro' | 'ai'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
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

    const { business_id, new_tier } = req.body as { business_id: string; new_tier: Tier }
    if (!business_id || !new_tier) {
      return res.status(400).json({ error: 'business_id and new_tier are required' })
    }
    if (!['free', 'pro', 'ai'].includes(new_tier)) {
      return res.status(400).json({ error: 'new_tier must be free, pro, or ai' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        tier: new_tier,
        admin_override: true,
      })
      .eq('id', business_id)

    if (updateError) {
      console.error('[override-tier] Error:', updateError)
      return res.status(500).json({ error: 'Failed to update tier' })
    }

    return res.status(200).json({ success: true, tier: new_tier })
  } catch (error) {
    console.error('[override-tier] Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
