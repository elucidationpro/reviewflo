import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { sendAdminNotification } from '@/lib/email-service'

const resend = new Resend(process.env.RESEND_API_KEY)

// Use anon key for public endpoint - RLS policies should control access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface WaitlistRequest {
  businessName: string
  email: string
  businessType: string
  phone?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      businessName,
      email,
      businessType,
      phone
    } = req.body as WaitlistRequest

    // Validate required fields
    if (!businessName || !email || !businessType) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Input validation and sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    // Length limits to prevent abuse
    if (businessName.length > 200) {
      return res.status(400).json({ error: 'Business name must be 200 characters or less' })
    }
    if (email.length > 255) {
      return res.status(400).json({ error: 'Email must be 255 characters or less' })
    }
    if (businessType.length > 100) {
      return res.status(400).json({ error: 'Business type must be 100 characters or less' })
    }
    if (phone && phone.length > 20) {
      return res.status(400).json({ error: 'Phone must be 20 characters or less' })
    }

    // Save to waitlist table
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({
        business_name: businessName,
        email: email,
        business_type: businessType,
        phone: phone || null,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error saving to waitlist:', insertError)
      return res.status(500).json({ error: 'Failed to save to waitlist' })
    }

    // Create confirmation email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You are on the ReviewFlo waitlist</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: #4A3428; padding: 32px 28px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">You are on the list</h1>
          </div>

          <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">
              Hi there,
            </p>

            <p style="color: #4b5563; margin: 0 0 20px 0;">
              Thanks for joining the ReviewFlo waitlist for <strong>${businessName}</strong>.
            </p>

            <div style="background: #f8f4ee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C9A961;">
              <h2 style="color: #4A3428; font-size: 20px; margin: 0 0 15px 0;">What happens next</h2>
              <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;">We&apos;ll send launch updates and product progress</li>
                <li style="margin-bottom: 10px;">You&apos;ll get early access invites as spots open</li>
                <li style="margin-bottom: 10px;">You can reply anytime with questions about your ${businessType.toLowerCase()} workflow</li>
              </ul>
            </div>

            <p style="color: #4b5563; margin: 20px 0 0 0;">
              ReviewFlo helps you get more 5-star reviews while routing unhappy customers to private feedback first.
            </p>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://usereviewflo.com/pricing" style="display: inline-block; background: #4A3428; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 8px; font-weight: 600;">See Full Pricing</a>
            </div>
          </div>

          <div style="text-align: center; color: #9ca3af; font-size: 14px; padding: 20px;">
            <p style="margin: 0;">ReviewFlo • Stop bad reviews before they go public</p>
            <p style="margin: 5px 0 0 0;">Jeremy<br>Founder, ReviewFlo</p>
          </div>
        </body>
      </html>
    `

    // Send confirmation email
    const { error: emailError } = await resend.emails.send({
      from: 'Jeremy at ReviewFlo <jeremy@usereviewflo.com>',
      to: email,
      subject: "You're on the ReviewFlo waitlist",
      html: emailHtml,
    })

    if (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the request if email fails - they're still on the waitlist
    }

    // Send admin notification
    try {
      await sendAdminNotification('waitlist', {
        email,
        businessName,
        businessType,
        phone: phone || undefined,
      })
    } catch (adminErr) {
      console.error('[join-waitlist] Admin notification failed:', adminErr)
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in join-waitlist API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
