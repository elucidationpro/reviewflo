import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendReviewRequestEmail } from '../../../lib/email-service'
import { sendReviewRequestSMS } from '../../../lib/sms-service'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Vercel cron sends Authorization: Bearer <CRON_SECRET>
const CRON_SECRET = process.env.CRON_SECRET

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (CRON_SECRET && (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { data: due, error } = await supabaseAdmin
      .from('review_requests')
      .select(
        'id, business_id, customer_name, customer_email, customer_phone, optional_note, review_link, tracking_token, sent_via'
      )
      .eq('send_status', 'scheduled')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50)

    if (error) {
      console.error('[process-scheduled] Query error:', error)
      return res.status(500).json({ error: 'Failed to fetch scheduled requests' })
    }

    if (!due || due.length === 0) {
      return res.status(200).json({ success: true, processed: 0, sent: 0, failed: 0 })
    }

    const businessIds = [...new Set(due.map((r) => r.business_id))]
    const { data: businesses, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, twilio_phone_number')
      .in('id', businessIds)

    if (bizError) {
      console.error('[process-scheduled] Business query error:', bizError)
      return res.status(500).json({ error: 'Failed to load business data' })
    }

    const bizMap = new Map((businesses || []).map((b) => [b.id, b]))

    let sent = 0
    let failed = 0

    for (const r of due) {
      const biz = bizMap.get(r.business_id)
      const businessName = biz?.business_name || 'Your business'

      try {
        if (r.sent_via === 'sms') {
          if (!r.customer_phone) throw new Error('Missing customer_phone for scheduled SMS request')

          const smsRes = await sendReviewRequestSMS(
            r.customer_phone,
            r.customer_name,
            businessName,
            r.review_link,
            biz?.twilio_phone_number
          )
          if (!smsRes.success) throw new Error(smsRes.error || 'Failed to send SMS')
        } else {
          if (!r.customer_email) throw new Error('Missing customer_email for scheduled email request')

          const emailRes = await sendReviewRequestEmail({
            customerName: r.customer_name,
            customerEmail: r.customer_email,
            businessName,
            ownerName: businessName,
            reviewLink: r.review_link,
            trackingToken: r.tracking_token || null,
            optionalNote: r.optional_note || null,
          })
          if (!emailRes.success) throw new Error(String(emailRes.error || 'Failed to send email'))
        }

        await supabaseAdmin
          .from('review_requests')
          .update({
            send_status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', r.id)

        console.log(`[DRIP] Sent scheduled request ${r.id} for business ${r.business_id}`)
        sent++
      } catch (err) {
        console.error('[process-scheduled] Send failure:', r.id, err)
        await supabaseAdmin
          .from('review_requests')
          .update({ send_status: 'failed' })
          .eq('id', r.id)
        failed++
      }
    }

    return res.status(200).json({
      success: true,
      processed: due.length,
      sent,
      failed,
    })
  } catch (err) {
    console.error('[process-scheduled] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

