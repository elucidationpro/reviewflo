import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendReviewRequestSMS } from '../../../lib/sms-service'
import { canUseSMS } from '../../../lib/tier-permissions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'
const PHONE_REGEX = /^\+?1?\d{10,15}$/

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

    const { toNumber } = req.body as { toNumber?: string }
    if (!toNumber?.trim()) {
      return res.status(400).json({ error: 'Phone number required' })
    }

    const phone = toNumber.trim().replace(/\s/g, '')
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

    const reviewLink = `${BASE_URL}/${business.slug}`
    const result = await sendReviewRequestSMS(
      phone,
      'Test Customer',
      business.business_name,
      reviewLink,
      business.twilio_phone_number
    )

    if (!result.success) {
      return res.status(500).json({ error: result.error ?? 'Failed to send test SMS' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[sms/test] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
