import type { NextApiRequest, NextApiResponse } from 'next'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

// Note: This endpoint needs service role to access auth.users table
// Consider adding rate limiting and validation to prevent abuse
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

interface FeedbackEmailRequest {
  businessId: string
  starRating: number
  whatHappened: string
  howToMakeRight: string
  wantsContact: boolean
  email?: string
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
      businessId,
      starRating,
      whatHappened,
      howToMakeRight,
      wantsContact,
      email,
      phone
    } = req.body as FeedbackEmailRequest

    // Input validation
    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'Valid business ID is required' })
    }

    if (!starRating || starRating < 1 || starRating > 5) {
      return res.status(400).json({ error: 'Star rating must be between 1 and 5' })
    }

    // Length limits to prevent abuse
    if (whatHappened && whatHappened.length > 2000) {
      return res.status(400).json({ error: 'What happened must be 2000 characters or less' })
    }
    if (howToMakeRight && howToMakeRight.length > 2000) {
      return res.status(400).json({ error: 'How to make it right must be 2000 characters or less' })
    }
    if (email && email.length > 255) {
      return res.status(400).json({ error: 'Email must be 255 characters or less' })
    }
    if (phone && phone.length > 20) {
      return res.status(400).json({ error: 'Phone must be 20 characters or less' })
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' })
      }
    }

    // Fetch business and owner information
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_name, user_id')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    // Fetch owner email from auth.users using admin client
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      business.user_id
    )

    if (userError || !userData.user?.email) {
      console.error('Error fetching user email:', userError)
      return res.status(404).json({ error: 'Business owner email not found' })
    }

    const ownerEmail = userData.user.email

    // Create email HTML content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Feedback</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #f3f4f6, #e5e7eb); padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: #1f2937; margin: 0 0 10px 0;">New Feedback Received</h1>
            <p style="color: #6b7280; margin: 0;">From ${business.business_name}</p>
          </div>

          <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <div style="margin-bottom: 20px;">
              <h2 style="color: #374151; font-size: 18px; margin: 0 0 10px 0;">Customer Rating</h2>
              <div style="font-size: 24px; color: #f59e0b;">
                ${'★'.repeat(starRating)}${'☆'.repeat(5 - starRating)}
                <span style="color: #6b7280; font-size: 16px; margin-left: 10px;">${starRating} out of 5</span>
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <h3 style="color: #374151; font-size: 16px; margin: 0 0 10px 0;">What happened?</h3>
              <p style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 0; white-space: pre-line;">
                ${whatHappened}
              </p>
            </div>

            <div style="margin-bottom: 20px;">
              <h3 style="color: #374151; font-size: 16px; margin: 0 0 10px 0;">How can we make it right?</h3>
              <p style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 0; white-space: pre-line;">
                ${howToMakeRight}
              </p>
            </div>

            ${wantsContact ? `
              <div style="background: #dbeafe; padding: 15px; border-radius: 5px; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 10px 0;">Customer wants to be contacted</h3>
                ${email ? `<p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>` : ''}
                ${phone ? `<p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${phone}" style="color: #2563eb;">${phone}</a></p>` : ''}
              </div>
            ` : `
              <div style="background: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;">Customer does not want to be contacted</p>
              </div>
            `}
          </div>

          <div style="text-align: center; color: #9ca3af; font-size: 14px; padding: 20px;">
            <p style="margin: 0;">This email was sent from ReviewFlo</p>
            <p style="margin: 5px 0 0 0;">Log in to your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/dashboard" style="color: #3b82f6;">dashboard</a> to manage feedback</p>
          </div>
        </body>
      </html>
    `

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'ReviewFlo <noreply@usereviewflo.com>',
      to: ownerEmail,
      subject: `New Feedback from ${business.business_name}`,
      html: emailHtml,
    })

    if (error) {
      console.error('Error sending email:', error)
      return res.status(500).json({ error: 'Failed to send email' })
    }

    return res.status(200).json({ success: true, messageId: data?.id })
  } catch (error) {
    console.error('Error in send-feedback-email API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
