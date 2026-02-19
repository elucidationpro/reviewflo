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
  if (req.method !== 'POST' && req.method !== 'DELETE') {
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

    const { id: signupId } = req.body as { id: string }
    if (!signupId) {
      return res.status(400).json({ error: 'Early access signup id is required' })
    }

    const { error: deleteError } = await supabaseAdmin
      .from('early_access_signups')
      .delete()
      .eq('id', signupId)

    if (deleteError) {
      console.error('Error deleting early access signup:', deleteError)
      return res.status(500).json({ error: deleteError.message || 'Failed to delete' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in delete-early-access-signup API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
