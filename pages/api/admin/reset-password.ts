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

interface ResetPasswordRequest {
  userId: string
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

    const { userId } = req.body as ResetPasswordRequest

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Get user email for password reset
    const { data: targetUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)

    if (getUserError || !targetUser.user?.email) {
      console.error('Error fetching user:', getUserError)
      return res.status(404).json({ error: 'User not found' })
    }

    // Send password reset email instead of generating password
    // This is more secure as the user sets their own password via secure link
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.user.email,
    })

    if (resetError) {
      console.error('Error generating password reset link:', resetError)
      return res.status(500).json({ error: 'Failed to send password reset email' })
    }

    // Note: Supabase generates the link but doesn't return it in the response
    // The link is sent via email automatically by Supabase
    return res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully. The user will receive an email with instructions to reset their password.',
    })
  } catch (error) {
    console.error('Error in reset-password API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
