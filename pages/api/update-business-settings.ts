import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

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

interface UpdateBusinessSettingsRequest {
  businessId: string
  businessName?: string
  primaryColor?: string
  logoUrl?: string | null
  skipTemplateChoice?: boolean
  googleReviewUrl?: string | null
  facebookReviewUrl?: string | null
  yelpReviewUrl?: string | null
  nextdoorReviewUrl?: string | null
  showReviewfloBranding?: boolean
  googlePlaceId?: string | null
  smsEnabled?: boolean
  twilioPhoneNumber?: string | null
  whiteLabelEnabled?: boolean
  customLogoUrl?: string | null
  customBrandName?: string | null
  customBrandColor?: string | null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    const body = req.body as UpdateBusinessSettingsRequest
    const { businessId } = body

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' })
    }

    // Verify user owns this business
    const { data: business, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !business) {
      return res.status(403).json({ error: 'You do not have permission to update this business' })
    }

    const updateData: Record<string, string | boolean | null> = {}
    if (body.businessName !== undefined) updateData.business_name = body.businessName
    if (body.primaryColor !== undefined) updateData.primary_color = body.primaryColor
    if (body.logoUrl !== undefined) updateData.logo_url = body.logoUrl
    if (body.skipTemplateChoice !== undefined) updateData.skip_template_choice = body.skipTemplateChoice
    if (body.googleReviewUrl !== undefined) updateData.google_review_url = body.googleReviewUrl
    if (body.facebookReviewUrl !== undefined) updateData.facebook_review_url = body.facebookReviewUrl
    if (body.yelpReviewUrl !== undefined) updateData.yelp_review_url = body.yelpReviewUrl
    if (body.nextdoorReviewUrl !== undefined) updateData.nextdoor_review_url = body.nextdoorReviewUrl
    if (body.showReviewfloBranding !== undefined) updateData.show_reviewflo_branding = body.showReviewfloBranding
    if (body.googlePlaceId !== undefined) updateData.google_place_id = body.googlePlaceId
    if (body.smsEnabled !== undefined) updateData.sms_enabled = body.smsEnabled
    if (body.twilioPhoneNumber !== undefined) updateData.twilio_phone_number = body.twilioPhoneNumber
    if (body.whiteLabelEnabled !== undefined) updateData.white_label_enabled = body.whiteLabelEnabled
    if (body.customLogoUrl !== undefined) updateData.custom_logo_url = body.customLogoUrl
    if (body.customBrandName !== undefined) updateData.custom_brand_name = body.customBrandName
    if (body.customBrandColor !== undefined) updateData.custom_brand_color = body.customBrandColor

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)

    if (updateError) {
      console.error('Error updating business settings:', updateError)
      const errMsg = (updateError as { message?: string }).message || String(updateError)
      // If column doesn't exist (migration not run), retry without skip_template_choice
      const isColumnError = /skip_template_choice|does not exist|undefined column|column.*not found/i.test(errMsg)
      if (isColumnError && body.skipTemplateChoice !== undefined) {
        const { skip_template_choice: _skip, ...coreData } = updateData
        const { error: retryError } = await supabaseAdmin
          .from('businesses')
          .update(coreData)
          .eq('id', businessId)
        if (retryError) {
          return res.status(500).json({ error: 'Failed to update business information', details: (retryError as { message?: string }).message })
        }
        return res.status(200).json({
          success: true,
          templateSettingSkipped: true,
          message: 'Settings saved. The template choice option requires a database migration — run add-skip-template-choice-migration.sql in Supabase.'
        })
      }
      return res.status(500).json({ error: 'Failed to update business information', details: errMsg })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in update-business-settings:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
