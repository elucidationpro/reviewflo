import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import type { Tier } from './tier-permissions'

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

  const { data: business, error: bizError } = await supabaseAdmin
    .from('businesses')
    .select(select)
    .eq('user_id', user.id)
    .single()

  if (bizError || !business) {
    apiError(res, 404, 'Business not found')
    return null
  }

  return { user, business: business as unknown as Record<string, unknown> }
}
