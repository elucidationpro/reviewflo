import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendReviewReminderEmail } from '../../../lib/email-service'
import { sendReviewReminderSMS } from '../../../lib/sms-service'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Vercel cron sends Authorization: Bearer <CRON_SECRET>
const CRON_SECRET = process.env.CRON_SECRET

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify cron secret
  const authHeader = req.headers.authorization
  if (CRON_SECRET && (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const iso = threeDaysAgo.toISOString()

    const { data: pending, error } = await supabaseAdmin
      .from('review_requests')
      .select('id, business_id, customer_name, customer_email, customer_phone, review_link, sent_via')
      .eq('status', 'pending')
      .eq('reminder_sent', false)
      .lt('sent_at', iso)

    if (error) {
      console.error('[send-reminders] Query error:', error)
      return res.status(500).json({ error: 'Failed to fetch pending reminders' })
    }

    const businessIds = [...new Set((pending || []).map((r) => r.business_id))]
    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, tier, sms_enabled, twilio_phone_number')
      .in('id', businessIds)
    const bizMap = new Map((businesses || []).map((b) => [b.id, b]))

    let sent = 0
    for (const req of pending || []) {
      const biz = bizMap.get(req.business_id)
      const businessName = biz?.business_name || 'Your business'

      // AI tier + SMS enabled + has customer_phone -> send SMS reminder
      if (biz?.tier === 'ai' && biz?.sms_enabled && req.customer_phone) {
        const result = await sendReviewReminderSMS(
          req.customer_phone,
          req.customer_name,
          businessName,
          req.review_link,
          biz.twilio_phone_number
        )
        if (result.success) {
          await supabaseAdmin
            .from('review_requests')
            .update({
              reminder_sent: true,
              reminder_sent_at: new Date().toISOString(),
            })
            .eq('id', req.id)
          sent++
        }
      } else if (req.customer_email) {
        // Send email reminder (Pro/Free or when no phone)
        const result = await sendReviewReminderEmail({
          customerName: req.customer_name,
          customerEmail: req.customer_email,
          businessName,
          reviewLink: req.review_link,
        })
        if (result.success) {
          await supabaseAdmin
            .from('review_requests')
            .update({
              reminder_sent: true,
              reminder_sent_at: new Date().toISOString(),
            })
            .eq('id', req.id)
          sent++
        }
      }
    }

    return res.status(200).json({
      success: true,
      processed: (pending || []).length,
      sent,
    })
  } catch (err) {
    console.error('[send-reminders] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
