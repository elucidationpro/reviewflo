import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendReviewRequestEmail } from '@/lib/email-service'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, business_id } = req.body as { email?: string; business_id?: string }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' })
    }
    if (!business_id || typeof business_id !== 'string') {
      return res.status(400).json({ error: 'business_id is required' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(503).json({ error: 'Supabase env not configured' })
    }

    const { data: business, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, slug')
      .eq('id', business_id)
      .single()

    if (bizError || !business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    const reviewLink = `${BASE_URL}/${business.slug}`
    const trackingToken = crypto.randomUUID()

    console.log(
      `[SURVEY] Triggering send for business ${business.id}, contact ${normalizedEmail}, reason: manual_test_endpoint`
    )

    const result = await sendReviewRequestEmail({
      customerName: 'Test Customer',
      customerEmail: normalizedEmail,
      businessName: business.business_name,
      ownerName: business.business_name,
      reviewLink,
      trackingToken,
      optionalNote: 'This is a test survey email sent from /api/survey/send-test (dev only).',
    })

    if (!result.success) {
      console.log(`[SURVEY] Send failed: ${String(result.error)}`)
      return res.status(500).json({ error: String(result.error) })
    }

    console.log(`[SURVEY] Send succeeded: messageId ${result.id ?? 'unknown'}`)
    return res.status(200).json({ success: true, messageId: result.id })
  } catch (err) {
    console.log(`[SURVEY] Send failed: ${String(err)}`)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

