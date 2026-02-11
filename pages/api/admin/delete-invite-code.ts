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

interface DeleteInviteCodeRequest {
  codeId: string
}

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

    const { codeId } = req.body as DeleteInviteCodeRequest

    if (!codeId) {
      return res.status(400).json({ error: 'Code ID is required' })
    }

    // Check if code is already used
    const { data: existingCode } = await supabaseAdmin
      .from('invite_codes')
      .select('used')
      .eq('id', codeId)
      .single()

    if (!existingCode) {
      return res.status(404).json({ error: 'Invite code not found' })
    }

    if (existingCode.used) {
      return res.status(400).json({ error: 'Cannot delete a used invite code' })
    }

    // Delete invite code
    const { error: deleteError } = await supabaseAdmin
      .from('invite_codes')
      .delete()
      .eq('id', codeId)

    if (deleteError) {
      console.error('Error deleting invite code:', deleteError)
      return res.status(500).json({ error: 'Failed to delete invite code' })
    }

    return res.status(200).json({
      success: true,
      message: 'Invite code deleted successfully',
    })
  } catch (error) {
    console.error('Error in delete-invite-code API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
