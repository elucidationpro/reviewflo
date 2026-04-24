import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendReviewRequestEmail } from '../../lib/email-service'
import { canSendFromDashboard } from '../../lib/tier-permissions'
import { getNextAvailableSendSlot } from '../../lib/drip-limiter'
import { getBusinessForRequest } from '../../lib/business-account'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'

function formatScheduledFor(d: Date): string {
  try {
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return d.toISOString()
  }
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

    // Get business and verify tier (supports optional businessId for multi-location)
    const businessId = typeof req.body?.businessId === 'string' ? req.body.businessId : null
    const { row: businessRow, error: lookupErr } = await getBusinessForRequest(
      supabaseAdmin,
      user.id,
      businessId,
      'id, business_name, slug, owner_email, tier'
    )
    if (!businessRow) {
      return res.status(lookupErr === 'not found' ? 403 : 404).json({ error: 'Business not found' })
    }
    const business = businessRow as { id: string; business_name: string; slug: string; owner_email: string; tier: string | null }

    if (!canSendFromDashboard(business.tier as 'free' | 'pro' | 'ai')) {
      return res.status(403).json({ error: 'Pro or AI tier required to send from dashboard' })
    }

    const reviewLink = `${BASE_URL}/${business.slug}`
    const ownerName = business.business_name // Fallback if no separate owner name
    const trackingToken = crypto.randomUUID()

    const slot = await getNextAvailableSendSlot({
      businessId: business.id,
      tier: business.tier as 'free' | 'pro' | 'ai',
      supabaseAdmin,
    })
    const withinFiveMinutes = Math.abs(slot.getTime() - Date.now()) <= 5 * 60_000

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
        send_status: withinFiveMinutes ? 'pending' : 'scheduled',
        scheduled_for: withinFiveMinutes ? null : slot.toISOString(),
        queued_at: withinFiveMinutes ? null : new Date().toISOString(),
        sent_at: withinFiveMinutes ? undefined : null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[send-review-request] Insert error:', insertError)
      return res.status(500).json({ error: 'Failed to create review request' })
    }

    if (!withinFiveMinutes) {
      console.log(
        `[SURVEY] Triggering send for business ${business.id}, contact ${email}, reason: scheduled_for_${slot.toISOString()}`
      )
      return res.status(200).json({
        success: true,
        id: insertData.id,
        queued: true,
        scheduledFor: slot.toISOString(),
        message: `Your request is scheduled for ${formatScheduledFor(slot)}.`,
      })
    }

    console.log(
      `[SURVEY] Triggering send for business ${business.id}, contact ${email}, reason: dashboard_send_now`
    )
    const emailResult = await sendReviewRequestEmail({
      customerName: customerName.trim(),
      customerEmail: email,
      businessName: business.business_name,
      ownerName,
      reviewLink,
      trackingToken,
      optionalNote: optionalNote?.trim() || null,
    })

    await supabaseAdmin
      .from('review_requests')
      .update({
        send_status: emailResult.success ? 'sent' : 'failed',
        sent_at: emailResult.success ? new Date().toISOString() : undefined,
      })
      .eq('id', insertData.id)

    if (!emailResult.success) {
      // Don't fail - record is created, email might have failed
      console.error('[send-review-request] Email failed:', emailResult.error)
      console.log(`[SURVEY] Send failed: ${String(emailResult.error)}`)
    } else {
      console.log(`[SURVEY] Send succeeded: messageId ${emailResult.id ?? 'unknown'}`)
    }

    return res.status(200).json({
      success: true,
      id: insertData.id,
      emailSent: emailResult.success,
      queued: false,
    })
  } catch (error) {
    console.error('[send-review-request] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
