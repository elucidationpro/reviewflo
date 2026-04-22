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

  // platform is optional — omit it for star-click completions, provide it for platform-click conversions
  const normalizedPlatform = platform ? platform.toLowerCase() : null
  if (normalizedPlatform && !VALID_PLATFORMS.includes(normalizedPlatform)) {
    return res.status(400).json({ error: 'invalid platform' })
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

    const updates: Record<string, string> = {}

    // Upgrade status to completed on any star click (or platform click without prior star)
    if (data.status !== 'completed') {
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()
    }

    // Always record the platform when provided — this is the conversion event.
    // Must write even if status was already completed (star click already set it).
    if (normalizedPlatform) {
      updates.platform_selected = normalizedPlatform
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from('review_requests')
        .update(updates)
        .eq('id', data.id)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[track/complete] Error:', err)
    // Return 200 so the customer flow is never blocked by a tracking failure
    return res.status(200).json({ success: true })
  }
}
