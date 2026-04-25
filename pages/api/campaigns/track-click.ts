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
    const { data: contact, error } = await supabaseAdmin
      .from('campaign_contacts')
      .select('id, status, business_id')
      .eq('tracking_token', token)
      .single()

    if (error || !contact) {
      return res.redirect(302, BASE_URL)
    }

    if (contact.status === 'sent' || contact.status === 'opened' || contact.status === 'pending') {
      await supabaseAdmin
        .from('campaign_contacts')
        .update({ status: 'clicked', clicked_at: new Date().toISOString() })
        .eq('id', contact.id)
    }

    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('slug, google_review_url')
      .eq('id', contact.business_id)
      .single()

    const dest =
      biz?.google_review_url ||
      (biz?.slug ? `${BASE_URL}/${biz.slug}` : BASE_URL)

    return res.redirect(302, dest)
  } catch (err) {
    console.error('[campaigns/track-click] Error:', err)
    return res.redirect(302, BASE_URL)
  }
}
