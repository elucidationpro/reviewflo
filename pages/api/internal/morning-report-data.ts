/**
 * GET /api/internal/morning-report-data
 *
 * Internal endpoint used by the morning report scheduled task to fetch
 * ReviewFlo signup and conversion data from Supabase. The scheduled task
 * runs in a sandboxed environment that blocks direct Supabase connections,
 * so it calls this Vercel function instead.
 *
 * Auth: Bearer token validated against MORNING_REPORT_SECRET env var.
 */
import { createHash, timingSafeEqual } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

type Signup = {
  business_name: string
  created_at: string
}

type Conversion = {
  business_name: string
  tier: string
  updated_at: string
}

type ResponseData =
  | { signups: Signup[]; conversions: Conversion[] }
  | { error: string }

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Auth ─────────────────────────────────────────────────────────
  const secret = process.env.MORNING_REPORT_SECRET
  if (!secret) {
    console.error('[morning-report-data] MORNING_REPORT_SECRET is not configured')
    return res.status(500).json({ error: 'Server misconfiguration' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' })
  }

  const token = authHeader.slice('Bearer '.length).trim()
  const tokenHash = createHash('sha256').update(token, 'utf8').digest()
  const secretHash = createHash('sha256').update(secret, 'utf8').digest()
  if (!timingSafeEqual(tokenHash, secretHash)) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  // ── Queries ───────────────────────────────────────────────────────
  try {
    const [signupsRes, conversionsRes] = await Promise.all([
      supabaseAdmin
        .from('businesses')
        .select('business_name, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('businesses')
        .select('business_name, tier, updated_at')
        .in('tier', ['pro', 'ai'])
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false }),
    ])

    if (signupsRes.error) {
      console.error('[morning-report-data] signups query error:', signupsRes.error)
      return res.status(500).json({ error: `Signups query failed: ${signupsRes.error.message}` })
    }

    if (conversionsRes.error) {
      console.error('[morning-report-data] conversions query error:', conversionsRes.error)
      return res.status(500).json({ error: `Conversions query failed: ${conversionsRes.error.message}` })
    }

    return res.status(200).json({
      signups: signupsRes.data ?? [],
      conversions: conversionsRes.data ?? [],
    })
  } catch (err) {
    console.error('[morning-report-data] Unexpected error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
