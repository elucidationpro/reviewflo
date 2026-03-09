import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { wrapAuthLink } from '@/lib/auth-link-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Sends password reset email via Resend with wrapped links.
 * Uses usereviewflo.com/auth/verify instead of supabase.co links
 * to match sender domain and avoid spam filters.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email } = req.body as { email?: string }
    const emailTrim = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!emailTrim) {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }

    // generateLink fails for non-existent users - we still return success to prevent enumeration
    const { data: linkData, error: resetError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: emailTrim,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/update-password`,
        },
      })

    if (resetError || !linkData?.properties?.action_link) {
      // Don't reveal whether user exists - same behavior as resetPasswordForEmail
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a reset link.',
      })
    }

    const rawResetLink = linkData.properties.action_link
    const resetLink = wrapAuthLink(rawResetLink)

    if (!process.env.RESEND_API_KEY) {
      console.error('[send-password-reset] RESEND_API_KEY is not set')
      return res.status(500).json({
        error: 'Email service is not configured. Please try again later.',
      })
    }

    const { error: emailError } = await resend.emails.send({
      from: 'ReviewFlo Support <support@usereviewflo.com>',
      to: emailTrim,
      subject: 'Reset Your Password',
      text: `Hi there,

You requested to reset your password for your ReviewFlo account.

Reset your password: ${resetLink}

If you didn't request this, you can safely ignore this email. The link expires in 1 hour.

- Jeremy
ReviewFlo`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
<p>Hi there,</p>
<p>You requested to reset your password for your ReviewFlo account.</p>
<p><a href="${resetLink}" style="color: #2563eb;">Click here to reset your password</a></p>
<p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>
<p>- Jeremy<br>ReviewFlo</p>
</body>
</html>`,
    })

    if (emailError) {
      console.error('[send-password-reset] Email send failed:', emailError)
      return res.status(500).json({
        error: 'Failed to send reset email. Please try again.',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a reset link.',
    })
  } catch (error) {
    console.error('[send-password-reset] Unexpected error:', error)
    return res.status(500).json({
      error: 'Something went wrong. Please try again.',
    })
  }
}
