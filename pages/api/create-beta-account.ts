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
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' })
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

    // Create Supabase auth user
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

    // Send welcome email
    try {
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
              <h1 style="color: #ffffff; margin: 0; font-size: 32px;">Welcome to ReviewFlo!</h1>
            </div>

            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; padding: 30px; margin-bottom: 20px;">
              <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">
                Hi ${ownerName}!
              </p>

              <p style="color: #4b5563; margin: 0 0 20px 0;">
                Thank you for joining the ReviewFlo beta! We're excited to help ${businessName} turn negative reviews into opportunities and make it easier for happy customers to share their experiences.
              </p>

              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 15px 0;">Your Account Details</h2>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Business:</strong> ${businessName}</p>
                <p style="color: #4b5563; margin: 5px 0;"><strong>Review Page:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/${slug}" style="color: #3b82f6;">${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/${slug}</a></p>
              </div>

              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <h3 style="color: #1e40af; font-size: 18px; margin: 0 0 10px 0;">Getting Started</h3>
                <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 10px;">Log in to your <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/dashboard" style="color: #2563eb;">dashboard</a></li>
                  <li style="margin-bottom: 10px;">Customize your business settings and brand colors</li>
                  <li style="margin-bottom: 10px;">Add your review platform URLs (Google, Yelp, etc.)</li>
                  <li style="margin-bottom: 10px;">Create custom review templates for your customers</li>
                  <li style="margin-bottom: 10px;">Share your review page link with customers</li>
                </ol>
              </div>

              <p style="color: #4b5563; margin: 20px 0 0 0;">
                If you have any questions or need help getting started, just reply to this email. We're here to help!
              </p>

              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/login" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Log In to Your Dashboard
                </a>
              </div>
            </div>

            <div style="text-align: center; color: #9ca3af; font-size: 14px; padding: 20px;">
              <p style="margin: 0;">ReviewFlo - Fix it before it goes public</p>
              <p style="margin: 5px 0 0 0;">Beta Program</p>
            </div>
          </body>
        </html>
      `

      await resend.emails.send({
        from: 'ReviewFlo <noreply@usereviewflo.com>',
        to: email,
        subject: `Welcome to ReviewFlo Beta - ${businessName}`,
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
