import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendReviewRequestSMS } from '../../../lib/sms-service'
import { canUseSMS } from '../../../lib/tier-permissions'
import { getNextAvailableSendSlot } from '../../../lib/drip-limiter'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'

const PHONE_REGEX = /^\+?1?\d{10,15}$/

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

    const { customer_name, customer_phone, optional_note } = req.body as {
      customer_name?: string
      customer_phone?: string
      optional_note?: string | null
    }

    if (!customer_name?.trim()) {
      return res.status(400).json({ error: 'customer_name is required' })
    }
    if (!customer_phone?.trim()) {
      return res.status(400).json({ error: 'customer_phone is required' })
    }

    const phone = customer_phone.trim().replace(/\s/g, '')
    if (!PHONE_REGEX.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' })
    }

    const { data: business, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, slug, tier, sms_enabled, twilio_phone_number')
      .eq('user_id', user.id)
      .single()

    if (bizError || !business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    if (!canUseSMS(business.tier as 'free' | 'pro' | 'ai')) {
      return res.status(403).json({ error: 'SMS feature requires AI tier' })
    }

    if (!business.sms_enabled) {
      return res.status(403).json({ error: 'SMS is not enabled for your business. Enable it in Settings.' })
    }

    const reviewLink = `${BASE_URL}/${business.slug}`

    const slot = await getNextAvailableSendSlot({
      businessId: business.id,
      tier: business.tier as 'free' | 'pro' | 'ai',
      supabaseAdmin,
    })
    const withinFiveMinutes = Math.abs(slot.getTime() - Date.now()) <= 5 * 60_000

    if (!withinFiveMinutes) {
      const { data: request, error: insertError } = await supabaseAdmin
        .from('review_requests')
        .insert({
          business_id: business.id,
          customer_name: customer_name.trim(),
          customer_phone: phone,
          customer_email: null,
          optional_note: optional_note?.trim() || null,
          review_link: reviewLink,
          sent_via: 'sms',
          status: 'pending',
          send_status: 'scheduled',
          scheduled_for: slot.toISOString(),
          queued_at: new Date().toISOString(),
          sent_at: null,
        })
        .select()
        .single()

      if (insertError) {
        console.error('[sms/send-review-request] Insert error:', insertError)
        return res.status(500).json({ error: 'Failed to queue SMS review request' })
      }

      return res.status(200).json({
        success: true,
        queued: true,
        scheduledFor: slot.toISOString(),
        message: `Your request is scheduled for ${formatScheduledFor(slot)}.`,
        request,
      })
    }

    const result = await sendReviewRequestSMS(
      phone,
      customer_name.trim(),
      business.business_name,
      reviewLink,
      business.twilio_phone_number
    )

    if (!result.success) {
      return res.status(500).json({ error: result.error ?? 'Failed to send SMS' })
    }

    const { data: request, error: insertError } = await supabaseAdmin
      .from('review_requests')
      .insert({
        business_id: business.id,
        customer_name: customer_name.trim(),
        customer_phone: phone,
        customer_email: null,
        optional_note: optional_note?.trim() || null,
        review_link: reviewLink,
        sent_via: 'sms',
        status: 'pending',
        send_status: 'sent',
      })
      .select()
      .single()

    if (insertError) {
      console.error('[sms/send-review-request] Insert error:', insertError)
      return res.status(500).json({ error: 'SMS sent but failed to record request' })
    }

    return res.status(200).json({ success: true, queued: false, request })
  } catch (error) {
    console.error('[sms/send-review-request] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
