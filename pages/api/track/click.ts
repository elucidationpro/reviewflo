import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { t: token } = req.query

  if (!token || typeof token !== 'string') {
    return res.redirect(302, BASE_URL)
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('review_requests')
      .select('id, status, review_link')
      .eq('tracking_token', token)
      .single()

    if (error || !data) {
      // Token not found — redirect to homepage gracefully
      return res.redirect(302, BASE_URL)
    }

    // Advance status to 'clicked' if not already further along
    if (data.status === 'pending' || data.status === 'opened') {
      await supabaseAdmin
        .from('review_requests')
        .update({
          status: 'clicked',
          clicked_at: new Date().toISOString(),
        })
        .eq('id', data.id)
    }

    // Redirect to the review page with the token so completion can be tracked
    const destination = `${data.review_link}?t=${token}`
    return res.redirect(302, destination)
  } catch (err) {
    console.error('[track/click] Error:', err)
    return res.redirect(302, BASE_URL)
  }
}
