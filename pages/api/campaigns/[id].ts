import type { NextApiRequest, NextApiResponse } from 'next'
import {
  apiError,
  apiSuccess,
  getAuthContext,
  parseTier,
  supabaseAdmin,
} from '../../../lib/api-utils'
import { canUseCampaigns } from '../../../lib/tier-permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!id) return apiError(res, 400, 'Missing campaign id')

  const ctx = await getAuthContext(req, res, 'id, tier')
  if (!ctx) return
  const business = ctx.business as { id: string; tier: string | null }
  const tier = parseTier(business.tier)
  if (!canUseCampaigns(tier)) {
    return apiError(res, 403, 'Pro or AI tier required for campaigns')
  }

  const { data: campaign, error } = await supabaseAdmin
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .single()

  if (error || !campaign) {
    return apiError(res, 404, 'Campaign not found')
  }

  if (req.method === 'GET') {
    const { data: contactRows, error: cErr } = await supabaseAdmin
      .from('campaign_contacts')
      .select('status')
      .eq('campaign_id', id)
    if (cErr) {
      console.error('[campaigns/[id]] Contacts error:', cErr)
      return apiError(res, 500, 'Failed to load contacts')
    }

    const stats = { pending: 0, sent: 0, clicked: 0, unsubscribed: 0, failed: 0 }
    for (const r of contactRows ?? []) {
      if (r.status in stats) (stats as Record<string, number>)[r.status]++
    }
    const everSent = stats.sent + stats.clicked
    const click_rate = everSent > 0 ? Math.round((stats.clicked / everSent) * 100) : 0

    return apiSuccess(res, {
      campaign,
      stats: { ...stats, ever_sent: everSent, click_rate },
    })
  }

  if (req.method === 'PATCH') {
    const body = (req.body as { status?: string }) || {}
    const next = body.status
    if (next !== 'paused' && next !== 'active') {
      return apiError(res, 400, 'status must be "paused" or "active"')
    }

    // Only allow paused <-> active transitions, not from completed.
    if (campaign.status === 'completed') {
      return apiError(res, 400, 'Cannot change status of a completed campaign')
    }

    const { error: updErr } = await supabaseAdmin
      .from('campaigns')
      .update({ status: next })
      .eq('id', id)
      .eq('business_id', business.id)

    if (updErr) {
      console.error('[campaigns/[id]] Update error:', updErr)
      return apiError(res, 500, 'Failed to update campaign')
    }

    return apiSuccess(res, { id, status: next })
  }

  if (req.method === 'DELETE') {
    const { error: delErr } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('business_id', business.id)
    if (delErr) {
      console.error('[campaigns/[id]] Delete error:', delErr)
      return apiError(res, 500, 'Failed to delete campaign')
    }
    return apiSuccess(res, { id, deleted: true })
  }

  return apiError(res, 405, 'Method not allowed')
}
