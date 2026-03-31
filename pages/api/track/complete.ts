import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VALID_PLATFORMS = ['google', 'facebook', 'yelp', 'nextdoor']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, platform } = req.body as { token?: string; platform?: string }

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required' })
  }

  if (!platform || !VALID_PLATFORMS.includes(platform.toLowerCase())) {
    return res.status(400).json({ error: 'valid platform is required' })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('review_requests')
      .select('id, status')
      .eq('tracking_token', token)
      .single()

    if (error || !data) {
      // Token not found — return 200 silently so the customer flow isn't interrupted
      return res.status(200).json({ success: true })
    }

    // Only mark complete if not already completed
    if (data.status !== 'completed') {
      await supabaseAdmin
        .from('review_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          platform_selected: platform.toLowerCase(),
        })
        .eq('id', data.id)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[track/complete] Error:', err)
    // Return 200 so the customer flow is never blocked by a tracking failure
    return res.status(200).json({ success: true })
  }
}
