import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, apiError } from '@/lib/api-utils'

/**
 * POST — delete a non-primary location for the logged-in user.
 * Body: { businessId: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return apiError(res, 401, 'Unauthorized')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return apiError(res, 401, 'Unauthorized')
    }

    const businessId = typeof req.body?.businessId === 'string' ? req.body.businessId : null
    if (!businessId) {
      return apiError(res, 400, 'businessId is required')
    }

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('businesses')
      .select('id, user_id, parent_business_id')
      .eq('id', businessId)
      .maybeSingle()

    if (fetchErr || !row) {
      return apiError(res, 404, 'Location not found')
    }
    if (row.user_id !== user.id) {
      return apiError(res, 403, 'Not your location')
    }
    if (!row.parent_business_id) {
      return apiError(res, 400, 'Cannot remove the primary location')
    }

    const { error: delErr } = await supabaseAdmin
      .from('businesses')
      .delete()
      .eq('id', businessId)
      .eq('user_id', user.id)

    if (delErr) {
      console.error('[remove-location] delete:', delErr.message)
      return apiError(res, 500, 'Failed to remove location')
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('[remove-location] unexpected:', e)
    return apiError(res, 500, 'Internal server error')
  }
}
