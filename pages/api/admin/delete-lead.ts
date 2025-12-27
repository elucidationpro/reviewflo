import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '../../../lib/adminAuth'

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
  if (req.method !== 'DELETE') {
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

    if (authError || !user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const { leadId } = req.body

    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' })
    }

    // Delete the lead
    const { error: deleteError } = await supabaseAdmin
      .from('leads')
      .delete()
      .eq('id', leadId)

    if (deleteError) {
      console.error('Error deleting lead:', deleteError)
      return res.status(500).json({ error: 'Failed to delete lead' })
    }

    console.log('[delete-lead] Successfully deleted lead:', leadId)
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in delete-lead API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
