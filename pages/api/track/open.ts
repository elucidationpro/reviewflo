import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 1x1 transparent GIF
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { t: token } = req.query

  if (token && typeof token === 'string') {
    // Fire and forget — don't let DB errors delay the pixel response
    supabaseAdmin
      .from('review_requests')
      .select('id, status')
      .eq('tracking_token', token)
      .single()
      .then(({ data }) => {
        if (data && data.status === 'pending') {
          return supabaseAdmin
            .from('review_requests')
            .update({
              status: 'opened',
              opened_at: new Date().toISOString(),
            })
            .eq('id', data.id)
        }
      })
      .catch((err) => {
        console.error('[track/open] Error:', err)
      })
  }

  // Always return the pixel immediately regardless of DB outcome
  res.setHeader('Content-Type', 'image/gif')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  res.setHeader('Pragma', 'no-cache')
  res.status(200).send(TRANSPARENT_GIF)
}
