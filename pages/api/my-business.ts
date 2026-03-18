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

/**
 * Returns the business for the logged-in user.
 * If user_id lookup fails (e.g. auth account was recreated), finds by owner_email
 * and auto-updates user_id so future lookups work. Prevents "No Business Found" issues.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // This endpoint is user-specific (Authorization header), so it must never be cached
  // by the browser/CDN, otherwise we can get 304 responses with no body.
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Vary', 'Authorization')

  if (req.method !== 'GET') {
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
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // First try: find by user_id (normal case)
    const { data: byUserId, error: byUserIdError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, slug, primary_color, google_review_url, facebook_review_url, skip_template_choice, tier, interested_in_tier, notify_on_launch, launch_discount_eligible, sms_enabled, twilio_phone_number, white_label_enabled, custom_logo_url, custom_brand_name, custom_brand_color, business_type, square_access_token')
      .eq('user_id', user.id)
      .single()

    if (!byUserIdError && byUserId) {
      return res.status(200).json({ business: byUserId })
    }

    // Second try: find by owner_email and fix the link (auto-heal)
    if (!user.email) {
      return res.status(200).json({ business: null })
    }

    const emailTrimmed = user.email.trim().toLowerCase()
    const { data: match, error: emailError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, slug, primary_color, google_review_url, facebook_review_url, skip_template_choice, tier, interested_in_tier, notify_on_launch, launch_discount_eligible, sms_enabled, twilio_phone_number, white_label_enabled, custom_logo_url, custom_brand_name, custom_brand_color, business_type, square_access_token')
      .ilike('owner_email', emailTrimmed)
      .limit(1)
      .maybeSingle()

    if (emailError) {
      console.error('[my-business] owner_email lookup error:', emailError)
    }
    if (!match) {
      return res.status(200).json({ business: null })
    }

    // Update user_id so future lookups by user_id succeed
    await supabaseAdmin
      .from('businesses')
      .update({ user_id: user.id })
      .eq('id', match.id)

    return res.status(200).json({ business: match })
  } catch (error) {
    console.error('[my-business] Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
