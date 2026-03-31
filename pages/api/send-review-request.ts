import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendReviewRequestEmail } from '../../lib/email-service'
import { canSendFromDashboard } from '../../lib/tier-permissions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { customerName, customerEmail, optionalNote } = req.body as {
      customerName?: string
      customerEmail?: string
      optionalNote?: string | null
    }

    if (!customerName?.trim() || !customerEmail?.trim()) {
      return res.status(400).json({ error: 'customerName and customerEmail are required' })
    }

    const email = customerEmail.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    if (optionalNote && optionalNote.length > 200) {
      return res.status(400).json({ error: 'Optional note must be 200 characters or less' })
    }

    // Get business and verify tier
    const { data: business, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, slug, owner_email, tier')
      .eq('user_id', user.id)
      .single()

    if (bizError || !business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    if (!canSendFromDashboard(business.tier as 'free' | 'pro' | 'ai')) {
      return res.status(403).json({ error: 'Pro or AI tier required to send from dashboard' })
    }

    const reviewLink = `${BASE_URL}/${business.slug}`
    const ownerName = business.business_name // Fallback if no separate owner name
    const trackingToken = crypto.randomUUID()

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('review_requests')
      .insert({
        business_id: business.id,
        customer_name: customerName.trim(),
        customer_email: email,
        optional_note: optionalNote?.trim() || null,
        review_link: reviewLink,
        status: 'pending',
        tracking_token: trackingToken,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[send-review-request] Insert error:', insertError)
      return res.status(500).json({ error: 'Failed to create review request' })
    }

    const emailResult = await sendReviewRequestEmail({
      customerName: customerName.trim(),
      customerEmail: email,
      businessName: business.business_name,
      ownerName,
      reviewLink,
      trackingToken,
      optionalNote: optionalNote?.trim() || null,
    })

    if (!emailResult.success) {
      // Don't fail - record is created, email might have failed
      console.error('[send-review-request] Email failed:', emailResult.error)
    }

    return res.status(200).json({
      success: true,
      id: insertData.id,
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error('[send-review-request] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
