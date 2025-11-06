import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qawrdhxyadfmuxdzeslo.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
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
          <title>Welcome to ReviewFlo</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 40px 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Welcome to ReviewFlo!</h1>
          </div>

          <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; padding: 30px; margin-bottom: 20px;">
            <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">
              Hi ${businessName}!
            </p>

            <p style="color: #4b5563; margin: 0 0 20px 0;">
              Thank you for joining our waitlist. We&apos;re excited to help you fix problems before they go public!
            </p>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 15px 0;">What&apos;s Next?</h2>
              <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 10px;">We&apos;ll send you updates as we get closer to launch</li>
                <li style="margin-bottom: 10px;">You&apos;ll be among the first to get access in Spring 2025</li>
                <li style="margin-bottom: 10px;">We&apos;ll reach out personally to understand your needs</li>
              </ul>
            </div>

            <p style="color: #4b5563; margin: 20px 0 0 0;">
              In the meantime, if you have any questions or specific needs for your ${businessType.toLowerCase()} business, feel free to reply to this email.
            </p>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                We can&apos;t wait to help you turn negative reviews into opportunities!
              </p>
            </div>
          </div>

          <div style="text-align: center; color: #9ca3af; font-size: 14px; padding: 20px;">
            <p style="margin: 0;">ReviewFlo - Fix it before it goes public</p>
            <p style="margin: 5px 0 0 0;">Launching Spring 2025</p>
          </div>
        </body>
      </html>
    `

    // Send confirmation email
    const { error: emailError } = await resend.emails.send({
      from: 'ReviewFlo <noreply@usereviewflo.com>',
      to: email,
      subject: 'Welcome to ReviewFlo - You&apos;re on the list!',
      html: emailHtml,
    })

    if (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the request if email fails - they're still on the waitlist
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in join-waitlist API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
