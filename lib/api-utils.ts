import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { Tier } from './tier-permissions'
import { getBusinessForRequest } from './business-account'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export function parseTier(raw: unknown): Tier {
  if (raw === 'pro' || raw === 'ai') return raw
  return 'free'
}

export function apiError(
  res: NextApiResponse,
  status: number,
  message: string,
  extra?: Record<string, unknown>
): void {
  res.status(status).json({ error: message, ...extra })
}

export function apiSuccess(res: NextApiResponse, data: Record<string, unknown>): void {
  res.status(200).json(data)
}

export interface AuthContext {
  user: User
  business: Record<string, unknown>
}

export async function getAuthContext(
  req: NextApiRequest,
  res: NextApiResponse,
  select = 'id, business_name, business_type, tier'
): Promise<AuthContext | null> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    apiError(res, 401, 'Unauthorized')
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    apiError(res, 401, 'Unauthorized')
    return null
  }

  // Accept optional businessId from query or body for multi-location flows;
  // falls back to the user's primary business row.
  const reqBody = (req.body as Record<string, unknown> | null | undefined) ?? null
  const bodyBusinessId = reqBody && typeof reqBody.businessId === 'string' ? reqBody.businessId : null
  const queryBusinessId = typeof req.query.businessId === 'string' ? req.query.businessId : null
  const businessId = bodyBusinessId || queryBusinessId

  const { row: business, error: lookupErr } = await getBusinessForRequest(
    supabaseAdmin,
    user.id,
    businessId,
    select
  )
  if (!business) {
    apiError(res, lookupErr === 'not found' ? 403 : 404, 'Business not found')
    return null
  }

  return { user, business }
}
