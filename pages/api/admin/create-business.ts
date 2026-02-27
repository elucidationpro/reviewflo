import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../lib/adminAuth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

interface CreateBusinessRequest {
  businessName: string
  ownerName: string
  ownerEmail: string
  phone?: string
  businessType?: string
  primaryColor?: string
  googleReviewUrl?: string
  facebookReviewUrl?: string
  yelpReviewUrl?: string
  nextdoorReviewUrl?: string
  sendWelcomeEmail?: boolean
  template1?: string
  template2?: string
  template3?: string
  /** When set, use this signup’s user_id and do not create a new auth user (early access flow) */
  earlyAccessSignupId?: string
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

    const {
      businessName,
      ownerName,
      ownerEmail,
      primaryColor = '#3B82F6',
      googleReviewUrl,
      facebookReviewUrl,
      yelpReviewUrl,
      nextdoorReviewUrl,
      sendWelcomeEmail = false,
      template1,
      template2,
      template3,
      earlyAccessSignupId,
    } = req.body as CreateBusinessRequest

    // Validate required fields
    if (!businessName || !ownerName || !ownerEmail) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    let userId: string

    if (earlyAccessSignupId) {
      // Early access: user already exists; create business for their account
      const { data: signup, error: signupError } = await supabaseAdmin
        .from('early_access_signups')
        .select('user_id, email')
        .eq('id', earlyAccessSignupId)
        .single()

      if (signupError || !signup) {
        return res.status(400).json({ error: 'Early access signup not found' })
      }
      if (signup.email.toLowerCase() !== ownerEmail.trim().toLowerCase()) {
        return res.status(400).json({ error: 'Email must match the early access signup' })
      }
      userId = signup.user_id
    } else {
      // Leads flow: create new auth user without password - they'll set it via invite email
      const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        email_confirm: false,
        user_metadata: {
          owner_name: ownerName,
          business_name: businessName
        }
      })

      if (createAuthError || !authData.user) {
        console.error('Error creating auth user:', createAuthError)
        return res.status(500).json({ error: createAuthError?.message || 'Failed to create account' })
      }
      userId = authData.user.id
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

    // Create business record
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        user_id: userId,
        business_name: businessName,
        owner_email: ownerEmail,
        slug: slug,
        primary_color: primaryColor,
        logo_url: null,
        google_review_url: googleReviewUrl || null,
        facebook_review_url: facebookReviewUrl || null,
        yelp_review_url: yelpReviewUrl || null,
        nextdoor_review_url: nextdoorReviewUrl || null,
      })
      .select()
      .single()

    if (businessError) {
      console.error('Error creating business:', businessError)
      if (!earlyAccessSignupId) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
      }
      return res.status(500).json({ error: 'Failed to create business record' })
    }

    if (earlyAccessSignupId) {
      await supabaseAdmin
        .from('early_access_signups')
        .update({ business_id: business.id, updated_at: new Date().toISOString() })
        .eq('id', earlyAccessSignupId)
    }

    // Create platform-specific review templates
    // If custom templates are provided, use them for all platforms
    // Otherwise, use platform-specific defaults
    const defaultGoogleTemplate = template1 || 'I had an excellent experience with ' + businessName + '! They exceeded my expectations. Highly recommend!'
    const defaultFacebookTemplate = template2 || 'Just had a great experience with ' + businessName + '! Professional service and fantastic results. 5 stars! ⭐⭐⭐⭐⭐'
    const defaultYelpTemplate = template3 || '5 stars for ' + businessName + '! Quality work, professional service, and fair pricing. Will definitely use again.'

    const templatesToCreate = [
      {
        business_id: business.id,
        platform: 'google',
        template_text: defaultGoogleTemplate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        business_id: business.id,
        platform: 'facebook',
        template_text: defaultFacebookTemplate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        business_id: business.id,
        platform: 'yelp',
        template_text: defaultYelpTemplate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    const { error: templatesError } = await supabaseAdmin
      .from('review_templates')
      .insert(templatesToCreate)

    if (templatesError) {
      console.error('Error creating templates:', templatesError)
      // Don't fail the entire request if templates fail, just log it
    }

    // Send welcome email with secure password setup link if requested (skip for early access - they already have an account)
    if (sendWelcomeEmail && !earlyAccessSignupId) {
      try {
        // Generate recovery link so user can set their password via /update-password
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: ownerEmail,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/update-password`,
          },
        })

        if (inviteError) {
          console.error('Error generating invite link:', inviteError)
        } else {
          const inviteLink = inviteData?.properties?.action_link

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
                    Your ReviewFlo account has been created! We're excited to help ${businessName} turn negative reviews into opportunities and make it easier for happy customers to share their experiences.
                  </p>

                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 15px 0;">Your Account Details</h2>
                    <p style="color: #4b5563; margin: 5px 0;"><strong>Email:</strong> ${ownerEmail}</p>
                    <p style="color: #4b5563; margin: 5px 0;"><strong>Review Page:</strong> <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/${slug}" style="color: #3b82f6;">${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/${slug}</a></p>
                  </div>

                  <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                    <h3 style="color: #1e40af; font-size: 18px; margin: 0 0 10px 0;">Getting Started</h3>
                    <ol style="color: #1e40af; margin: 0; padding-left: 20px;">
                      <li style="margin-bottom: 10px;">Click the button below to set your password and activate your account</li>
                      <li style="margin-bottom: 10px;">Log in to your dashboard</li>
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
                    <a href="${inviteLink || `${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/login`}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                      Set Password & Activate Account
                    </a>
                  </div>
                </div>

                <div style="text-align: center; color: #9ca3af; font-size: 14px; padding: 20px;">
                  <p style="margin: 0;">ReviewFlo - Fix it before it goes public</p>
                </div>
              </body>
            </html>
          `

          await resend.emails.send({
            from: 'ReviewFlo <noreply@usereviewflo.com>',
            to: ownerEmail,
            subject: `Welcome to ReviewFlo - ${businessName}`,
            html: emailHtml,
          })
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Business created successfully',
      business,
      slug,
    })
  } catch (error) {
    console.error('Error in create-business API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
