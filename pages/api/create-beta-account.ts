import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

interface CreateBetaAccountRequest {
  businessName: string
  ownerName: string
  email: string
  phone?: string
  password: string
  businessType?: string
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
      ownerName,
      email,
      password,
    } = req.body as CreateBetaAccountRequest

    // Validate required fields
    if (!businessName || !ownerName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' })
    }

    // Create Supabase auth user with password
    // Note: This is acceptable here since user is providing their own password during signup
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for beta users
      user_metadata: {
        owner_name: ownerName,
        business_name: businessName
      }
    })

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return res.status(500).json({ error: authError?.message || 'Failed to create account' })
    }

    const { isReservedSlug } = await import('@/lib/slug-utils')

    // Generate a unique slug from business name
    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)

    let slug = baseSlug
    let slugExists = true
    let counter = 1

    // Check if slug exists or is reserved (e.g. /admin, /join); append number if needed
    while (slugExists) {
      if (isReservedSlug(slug)) {
        slug = `${baseSlug}-${counter}`
        counter++
        continue
      }
      const { data: existingBusiness } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('slug', slug)
        .single()

      if (!existingBusiness) {
        slugExists = false
      } else {
        slug = `${baseSlug}-${counter}`
        counter++
      }
    }

    // Create business record with all known fields
    const businessInsertData = {
      user_id: authData.user.id,
      business_name: businessName,
      owner_email: email,
      slug: slug,
      primary_color: '#3B82F6', // Default blue color
      logo_url: null,
      google_review_url: null,
      facebook_review_url: null,
      yelp_review_url: null,
      nextdoor_review_url: null,
      terms_accepted_at: new Date().toISOString(),
    }

    console.log('=== BUSINESS INSERT DEBUG ===')
    console.log('About to insert business record with data:', JSON.stringify(businessInsertData, null, 2))
    console.log('Auth user ID:', authData.user.id)
    console.log('Business name:', businessName)
    console.log('Slug:', slug)
    console.log('============================')

    const { error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert(businessInsertData)
      .select()
      .single()

    if (businessError) {
      console.error('Error creating business:', businessError)
      console.error('Business error details:', JSON.stringify(businessError, null, 2))
      console.error('Attempted to insert:', {
        user_id: authData.user.id,
        business_name: businessName,
        slug: slug,
        primary_color: '#3B82F6',
      })
      // Clean up: delete the auth user if business creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return res.status(500).json({
        error: 'Failed to create business record',
        details: businessError.message,
        code: businessError.code
      })
    }

    // Send welcome email
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'
      const loginUrl = `${baseUrl}/login`
      const reviewPageUrl = `${baseUrl}/${slug}`

      // Get beta tester count for personalization
      const { count: betaCount } = await supabaseAdmin
        .from('businesses')
        .select('*', { count: 'exact', head: true })
      const betaTesterNumber = betaCount ?? 0

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ReviewFlo</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #4A3428; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: #C9A961; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              .box { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
              ol { padding-left: 20px; }
              li { margin-bottom: 8px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Welcome to ReviewFlo Beta! 🚀 Your Account is Ready</h1>
              </div>
              <div class="content">
                <p>Hi ${ownerName}!</p>

                <p>Your ReviewFlo account is set up and ready to use.</p>

                <div class="box">
                  <h2 style="color: #4A3428; font-size: 18px; margin: 0 0 12px 0;">LOGIN DETAILS</h2>
                  <p style="margin: 5px 0;"><strong>Website:</strong> <a href="${loginUrl}" style="color: #4A3428;">usereviewflo.com/login</a></p>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 5px 0;"><strong>Password:</strong> (the one you just created)</p>
                </div>

                <div class="box">
                  <h2 style="color: #4A3428; font-size: 18px; margin: 0 0 12px 0;">YOUR UNIQUE REVIEW LINK</h2>
                  <p style="margin: 5px 0;"><a href="${reviewPageUrl}" style="color: #4A3428;">${reviewPageUrl}</a></p>
                  <p style="margin: 12px 0 0 0;">Copy this link and send it to customers after you finish each job.</p>
                </div>

                <h2 style="color: #4A3428; font-size: 18px; margin: 20px 0 10px 0;">WHAT HAPPENS NEXT</h2>
                <ol>
                  <li>Your customer opens the link</li>
                  <li>They rate their experience (1-5 stars)</li>
                  <li>If 1-4 stars: You get private feedback via email (nothing goes public)</li>
                  <li>If 5 stars: They see easy templates to post a Google review</li>
                </ol>

                <h2 style="color: #4A3428; font-size: 18px; margin: 20px 0 10px 0;">TRY IT NOW</h2>
                <ol>
                  <li><a href="${loginUrl}" style="color: #4A3428;">Click here to log in</a></li>
                  <li>Send your review link to yourself (test it)</li>
                  <li>Rate your own "service" and see how it works</li>
                  <li>Then send it to your next customer!</li>
                </ol>

                <p>Questions? Just reply to this email.</p>

                <p>Thanks for being beta tester #${betaTesterNumber}!</p>

                <p><strong>- Jeremy</strong><br>
                ReviewFlo<br>
                <a href="mailto:jeremy@usereviewflo.com" style="color: #4A3428;">jeremy@usereviewflo.com</a></p>

                <p style="margin-top: 20px;"><em>P.S. This is beta, so if anything breaks or is confusing, please let me know. Your feedback helps us build exactly what you need.</em></p>

                <div style="text-align: center; margin-top: 28px;">
                  <a href="${loginUrl}" class="button">Log In to Your Dashboard</a>
                </div>
              </div>
              <div class="footer">
                <p style="margin: 0;">© ${new Date().getFullYear()} ReviewFlo. All rights reserved.</p>
                <p style="margin: 5px 0 0 0;">You're receiving this because you joined the ReviewFlo beta.</p>
              </div>
            </div>
          </body>
        </html>
      `

      await resend.emails.send({
        from: 'ReviewFlo <jeremy@usereviewflo.com>',
        to: email,
        subject: `Welcome to ReviewFlo Beta! 🚀 Your Account is Ready - ${businessName}`,
        html: emailHtml,
      })
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError)
      // Don't fail the request if email fails
    }

    return res.status(200).json({
      success: true,
      message: 'Account created successfully',
      slug: slug
    })
  } catch (error) {
    console.error('Error in create-beta-account API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
