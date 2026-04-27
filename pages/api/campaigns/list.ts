import type { NextApiRequest, NextApiResponse } from 'next'
import {
  apiError,
  apiSuccess,
  getAuthContext,
  parseTier,
  supabaseAdmin,
} from '../../../lib/api-utils'
import { canUseCampaigns } from '../../../lib/tier-permissions'

interface CampaignSummary {
  id: string
  name: string
  status: string
  total_contacts: number
  sent_count: number
  clicked_count: number
  unsubscribed_count: number
  failed_count: number
  click_rate: number
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return apiError(res, 405, 'Method not allowed')

  const ctx = await getAuthContext(req, res, 'id, tier')
  if (!ctx) return
  const business = ctx.business as { id: string; tier: string | null }
  const tier = parseTier(business.tier)
  if (!canUseCampaigns(tier)) {
    return apiError(res, 403, 'Campaigns are coming soon', { code: 'campaigns_disabled' })
  }

  const { data: campaigns, error } = await supabaseAdmin
    .from('campaigns')
    .select(
      'id, name, status, total_contacts, send_window_days, sends_per_day, send_time, started_at, completed_at, created_at'
    )
    .eq('business_id', business.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[campaigns/list] Query error:', error)
    return apiError(res, 500, 'Failed to load campaigns')
  }

  if (!campaigns || campaigns.length === 0) {
    return apiSuccess(res, { campaigns: [] })
  }

  const ids = campaigns.map((c) => c.id)
  const { data: contactRows, error: contactsErr } = await supabaseAdmin
    .from('campaign_contacts')
    .select('campaign_id, status')
    .in('campaign_id', ids)

  if (contactsErr) {
    console.error('[campaigns/list] Contacts query error:', contactsErr)
    return apiError(res, 500, 'Failed to load campaign stats')
  }

  const stats = new Map<
    string,
    { sent: number; clicked: number; unsubscribed: number; failed: number; total: number }
  >()
  for (const id of ids) {
    stats.set(id, { sent: 0, clicked: 0, unsubscribed: 0, failed: 0, total: 0 })
  }
  for (const row of contactRows ?? []) {
    const s = stats.get(row.campaign_id)
    if (!s) continue
    s.total++
    if (row.status === 'sent') s.sent++
    else if (row.status === 'clicked') s.clicked++
    else if (row.status === 'unsubscribed') s.unsubscribed++
    else if (row.status === 'failed') s.failed++
  }

  const result: CampaignSummary[] = campaigns.map((c) => {
    const s = stats.get(c.id) || { sent: 0, clicked: 0, unsubscribed: 0, failed: 0, total: 0 }
    // Total ever-sent = sent + clicked (clicked implies sent first).
    const everSent = s.sent + s.clicked
    const click_rate = everSent > 0 ? Math.round((s.clicked / everSent) * 100) : 0
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      total_contacts: c.total_contacts,
      sent_count: everSent,
      clicked_count: s.clicked,
      unsubscribed_count: s.unsubscribed,
      failed_count: s.failed,
      click_rate,
      created_at: c.created_at,
      started_at: c.started_at,
      completed_at: c.completed_at,
    }
  })

  return apiSuccess(res, { campaigns: result })
}
