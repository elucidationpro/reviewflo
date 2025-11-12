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

// Generate a random password
function generatePassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

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

    if (authError || !user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const { userId } = req.body as ResetPasswordRequest

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Generate new password
    const newPassword = generatePassword()

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error resetting password:', updateError)
      return res.status(500).json({ error: 'Failed to reset password' })
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      password: newPassword,
    })
  } catch (error) {
    console.error('Error in reset-password API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
