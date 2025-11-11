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

// Generate a random invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'BETA-'
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

interface GenerateInviteCodeRequest {
  customCode?: string
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

    if (authError || !user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const { customCode } = req.body as GenerateInviteCodeRequest

    // Use custom code or generate random one
    const code = customCode ? customCode.toUpperCase().trim() : generateInviteCode()

    // Check if code already exists
    const { data: existingCode } = await supabaseAdmin
      .from('invite_codes')
      .select('id')
      .eq('code', code)
      .single()

    if (existingCode) {
      return res.status(400).json({ error: 'This invite code already exists' })
    }

    // Create invite code
    const { data: inviteCode, error: createError } = await supabaseAdmin
      .from('invite_codes')
      .insert({
        code,
        used: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating invite code:', createError)
      return res.status(500).json({ error: 'Failed to create invite code' })
    }

    return res.status(200).json({
      success: true,
      message: 'Invite code created successfully',
      inviteCode,
    })
  } catch (error) {
    console.error('Error in generate-invite-code API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
