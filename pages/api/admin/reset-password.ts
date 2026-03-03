import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../lib/adminAuth'
import { Resend } from 'resend'
import { wrapAuthLink } from '@/lib/auth-link-utils'

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

const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Generate recovery link and send via Resend (generateLink doesn't auto-send emails)
    const { data: linkData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.user.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/update-password`,
      },
    })

    if (resetError || !linkData?.properties?.action_link) {
      console.error('Error generating password reset link:', resetError)
      return res.status(500).json({ error: 'Failed to generate password reset link' })
    }

    const rawResetLink = linkData.properties.action_link
    const resetLink = wrapAuthLink(rawResetLink)

    // Send password reset email via Resend
    try {
      const emailText = `Hi there,

You requested to reset your password for your ReviewFlo account.

Reset your password: ${resetLink}

If you didn't request this, you can safely ignore this email. The link expires in 1 hour.

- Jeremy
ReviewFlo`

      const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
<p>Hi there,</p>
<p>You requested to reset your password for your ReviewFlo account.</p>
<p><a href="${resetLink}" style="color: #2563eb;">Click here to reset your password</a></p>
<p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>
<p>- Jeremy<br>ReviewFlo</p>
</body>
</html>`

      await resend.emails.send({
        from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
        to: targetUser.user.email,
        subject: 'Reset Your ReviewFlo Password',
        text: emailText,
        html: emailHtml,
      })

      return res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully. The user will receive an email with instructions to reset their password.',
      })
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError)
      return res.status(500).json({ error: 'Failed to send password reset email' })
    }
  } catch (error) {
    console.error('Error in reset-password API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
