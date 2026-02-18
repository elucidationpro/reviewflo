import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../lib/adminAuth'
import { Resend } from 'resend'

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

    const resetLink = linkData.properties.action_link

    // Send password reset email via Resend
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your ReviewFlo Password</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 40px 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px;">Reset Your Password</h1>
            </div>

            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; padding: 30px; margin-bottom: 20px;">
              <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">
                Hi there,
              </p>

              <p style="color: #4b5563; margin: 0 0 20px 0;">
                You requested to reset your password for your ReviewFlo account. Click the button below to create a new password.
              </p>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${resetLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>

              <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px;">
                If you didn't request this password reset, you can safely ignore this email. The link will expire in 1 hour.
              </p>
            </div>

            <div style="text-align: center; color: #9ca3af; font-size: 14px; padding: 20px;">
              <p style="margin: 0;">ReviewFlo - Fix it before it goes public</p>
            </div>
          </body>
        </html>
      `

      await resend.emails.send({
        from: 'ReviewFlo <noreply@usereviewflo.com>',
        to: targetUser.user.email,
        subject: 'Reset Your ReviewFlo Password',
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
