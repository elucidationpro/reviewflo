import type { NextApiRequest, NextApiResponse } from 'next'
import {
  apiError,
  apiSuccess,
  getAuthContext,
  parseTier,
  supabaseAdmin,
} from '../../../../lib/api-utils'
import { canUseCampaigns } from '../../../../lib/tier-permissions'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return apiError(res, 405, 'Method not allowed')

  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (!id) return apiError(res, 400, 'Missing campaign id')

  const ctx = await getAuthContext(req, res, 'id, tier')
  if (!ctx) return
  const business = ctx.business as { id: string; tier: string | null }
  const tier = parseTier(business.tier)
  if (!canUseCampaigns(tier)) {
    return apiError(res, 403, 'Campaigns are coming soon', { code: 'campaigns_disabled' })
  }

  // Confirm campaign belongs to business (RLS would also enforce it via service role bypass; we use service role).
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id')
    .eq('id', id)
    .eq('business_id', business.id)
    .single()
  if (!campaign) return apiError(res, 404, 'Campaign not found')

  const all = req.query.all === '1' || req.query.all === 'true'
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = all ? 10000 : Math.min(200, Math.max(10, Number(req.query.pageSize) || 50))
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const query = supabaseAdmin
    .from('campaign_contacts')
    .select(
      'id, first_name, last_name, email, phone, status, scheduled_for, sent_at, clicked_at, error_message',
      { count: 'exact' }
    )
    .eq('campaign_id', id)
    .order('scheduled_for', { ascending: true })

  const { data, count, error } = all
    ? await query
    : await query.range(from, to)

  if (error) {
    console.error('[campaigns/[id]/contacts] Query error:', error)
    return apiError(res, 500, 'Failed to load contacts')
  }

  return apiSuccess(res, {
    contacts: data ?? [],
    total: count ?? (data?.length ?? 0),
    page,
    page_size: pageSize,
  })
}
