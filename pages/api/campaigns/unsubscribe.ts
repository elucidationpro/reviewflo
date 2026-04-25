import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken } from '../../../lib/campaign-tokens'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Accept token via body (POST/page) or query (GET — for List-Unsubscribe header).
  const token =
    (req.method === 'POST' && req.body && typeof req.body === 'object' && 'token' in req.body
      ? String((req.body as { token?: unknown }).token ?? '')
      : '') ||
    (typeof req.query.token === 'string' ? req.query.token : '')

  if (!token) {
    return res.status(400).json({ error: 'Missing token' })
  }

  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    return res.status(400).json({ error: 'Invalid or expired token' })
  }

  try {
    // Insert unsubscribe row (ignore unique-violation).
    const { error: insertErr } = await supabaseAdmin.from('unsubscribes').insert({
      business_id: payload.businessId,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
    })
    if (insertErr && insertErr.code !== '23505') {
      console.error('[campaigns/unsubscribe] Insert error:', insertErr)
      return res.status(500).json({ error: 'Failed to record unsubscribe' })
    }

    // Mark any pending campaign_contacts for this business + email/phone as unsubscribed.
    let q = supabaseAdmin
      .from('campaign_contacts')
      .update({ status: 'unsubscribed' })
      .eq('business_id', payload.businessId)
      .eq('status', 'pending')
    if (payload.email) q = q.eq('email', payload.email)
    else if (payload.phone) q = q.eq('phone', payload.phone)
    const { error: updErr } = await q
    if (updErr) {
      console.error('[campaigns/unsubscribe] Update contacts error:', updErr)
    }

    const { data: biz } = await supabaseAdmin
      .from('businesses')
      .select('business_name')
      .eq('id', payload.businessId)
      .single()

    return res.status(200).json({
      success: true,
      businessName: biz?.business_name ?? null,
    })
  } catch (err) {
    console.error('[campaigns/unsubscribe] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
