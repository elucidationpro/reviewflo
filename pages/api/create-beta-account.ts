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
  inviteCode: string
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
      inviteCode,
      businessName,
      ownerName,
      email,
      password,
    } = req.body as CreateBetaAccountRequest

    // Validate required fields
    if (!inviteCode || !businessName || !ownerName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' })
    }

    // Validate invite code again
    const { data: inviteCodeData, error: inviteError } = await supabaseAdmin
      .from('invite_codes')
      .select('id, code, used')
      .eq('code', inviteCode.trim().toUpperCase())
      .single()

    if (inviteError || !inviteCodeData) {
      return res.status(400).json({ error: 'Invalid invite code' })
    }

    if (inviteCodeData.used) {
      return res.status(400).json({ error: 'This invite code has already been used' })
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

    // Generate a unique slug from business name
    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)

    let slug = baseSlug
    let slugExists = true
    let counter = 1

    // Check if slug exists and append number if needed
    while (slugExists) {
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

    // Mark invite code as used
    const { error: updateError } = await supabaseAdmin
      .from('invite_codes')
      .update({
        used: true,
        used_by: email,
        used_at: new Date().toISOString()
      })
      .eq('id', inviteCodeData.id)

    if (updateError) {
      console.error('Error updating invite code:', updateError)
      // Don't fail the request, just log the error
    }

    // Send welcome email (aligned with early access welcome: survey CTA, brand colors, tone)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'
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
              .button-secondary { background: #4A3428; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
              ul { padding-left: 20px; }
              li { margin-bottom: 8px; }
              .box { background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 28px;">Welcome to ReviewFlo Beta! 🚀</h1>
              </div>
              <div class="content">
                <p>Hi ${ownerName}!</p>

                <p>Thanks for being part of the ReviewFlo beta! We're excited to help <strong>${businessName}</strong> get more 5-star reviews and catch unhappy customers before they post.</p>

                <p><strong>📋 Please complete this quick survey (3 min):</strong><br>
                <a href="https://usereviewflo.com/survey" class="button">Complete Survey →</a><br>
                It helps us understand what features you need and how to price ReviewFlo fairly.</p>

                <div class="box">
                  <h2 style="color: #4A3428; font-size: 18px; margin: 0 0 12px 0;">Your Account Details</h2>
                  <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                  <p style="margin: 5px 0;"><strong>Business:</strong> ${businessName}</p>
                  <p style="margin: 5px 0;"><strong>Review Page:</strong> <a href="${baseUrl}/${slug}" style="color: #4A3428;">${baseUrl}/${slug}</a></p>
                </div>

                <p><strong>Getting started:</strong> Log in to your <a href="${baseUrl}/login" style="color: #4A3428;">dashboard</a>, add your review platform URLs, and share your review page with customers.</p>

                <h2 style="color: #4A3428; font-size: 18px; margin: 20px 0 10px 0;">What You Get</h2>
                <ul>
                  <li>Stop bad reviews before they go public</li>
                  <li>Get more 5-star Google reviews automatically</li>
                  <li>Priority support from the founder (me!)</li>
                  <li>Help shape new features</li>
                </ul>

                <p>Questions? Just reply to this email.</p>

                <p>Thanks for being an early supporter!</p>

                <p><strong>- Jeremy</strong><br>
                ReviewFlo<br>
                <a href="mailto:jeremy@usereviewflo.com" style="color: #4A3428;">jeremy@usereviewflo.com</a></p>

                <div style="text-align: center; margin-top: 28px;">
                  <a href="${baseUrl}/login" class="button button-secondary">Log In to Your Dashboard</a>
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
        subject: `Welcome to ReviewFlo Beta! 🚀 - ${businessName}`,
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
