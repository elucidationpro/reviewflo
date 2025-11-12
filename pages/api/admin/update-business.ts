import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '../../../lib/adminAuth'

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

interface UpdateBusinessRequest {
  businessId: string
  businessName?: string
  ownerEmail?: string
  primaryColor?: string
  logoUrl?: string
  googleReviewUrl?: string
  facebookReviewUrl?: string
  yelpReviewUrl?: string
  nextdoorReviewUrl?: string
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

    if (authError || !user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const {
      businessId,
      businessName,
      ownerEmail,
      primaryColor,
      logoUrl,
      googleReviewUrl,
      facebookReviewUrl,
      yelpReviewUrl,
      nextdoorReviewUrl,
    } = req.body as UpdateBusinessRequest

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' })
    }

    // Build update object with only provided fields
    const updateData: Record<string, string | null> = {}
    if (businessName !== undefined) updateData.business_name = businessName
    if (ownerEmail !== undefined) updateData.owner_email = ownerEmail
    if (primaryColor !== undefined) updateData.primary_color = primaryColor
    if (logoUrl !== undefined) updateData.logo_url = logoUrl || null
    if (googleReviewUrl !== undefined) updateData.google_review_url = googleReviewUrl || null
    if (facebookReviewUrl !== undefined) updateData.facebook_review_url = facebookReviewUrl || null
    if (yelpReviewUrl !== undefined) updateData.yelp_review_url = yelpReviewUrl || null
    if (nextdoorReviewUrl !== undefined) updateData.nextdoor_review_url = nextdoorReviewUrl || null

    // Update business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single()

    if (businessError) {
      console.error('Error updating business:', businessError)
      return res.status(500).json({ error: 'Failed to update business' })
    }

    return res.status(200).json({
      success: true,
      message: 'Business updated successfully',
      business,
    })
  } catch (error) {
    console.error('Error in update-business API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
