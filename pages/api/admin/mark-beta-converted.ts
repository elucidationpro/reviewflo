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
  if (req.method !== 'POST') {
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

    const { betaSignupId } = req.body

    if (!betaSignupId) {
      return res.status(400).json({ error: 'betaSignupId is required' })
    }

    // Update the beta signup to mark it as converted
    const { error: updateError } = await supabaseAdmin
      .from('beta_signups')
      .update({ converted: true })
      .eq('id', betaSignupId)

    if (updateError) {
      console.error('Error marking beta signup as converted:', updateError)
      return res.status(500).json({ error: 'Failed to mark beta signup as converted' })
    }

    console.log('[mark-beta-converted] Successfully marked beta signup as converted:', betaSignupId)
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in mark-beta-converted API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
