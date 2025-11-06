import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client
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

interface ValidateInviteCodeRequest {
  code: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code } = req.body as ValidateInviteCodeRequest

    if (!code || !code.trim()) {
      return res.status(400).json({ valid: false, error: 'Invite code is required' })
    }

    // Check if invite code exists and is not used
    const { data: inviteCode, error } = await supabaseAdmin
      .from('invite_codes')
      .select('id, code, used')
      .eq('code', code.trim().toUpperCase())
      .single()

    if (error || !inviteCode) {
      return res.status(200).json({ valid: false, error: 'Invalid invite code' })
    }

    if (inviteCode.used) {
      return res.status(200).json({ valid: false, error: 'This invite code has already been used' })
    }

    return res.status(200).json({ valid: true })
  } catch (error) {
    console.error('Error validating invite code:', error)
    return res.status(500).json({ valid: false, error: 'Internal server error' })
  }
}
