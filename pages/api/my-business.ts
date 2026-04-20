import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getMaxBusinessLocations } from '../../lib/tier-permissions'
import { pickPrimaryBusinessRow, sortLocationSummaries } from '../../lib/business-account'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const BUSINESS_SELECT =
  'id, business_name, slug, primary_color, google_review_url, facebook_review_url, skip_template_choice, tier, interested_in_tier, notify_on_launch, launch_discount_eligible, business_type, parent_business_id, created_at'

const BUSINESS_SELECT_LEGACY =
  'id, business_name, slug, primary_color, google_review_url, facebook_review_url, skip_template_choice, tier, interested_in_tier, notify_on_launch, launch_discount_eligible, business_type, created_at'

type BusinessRow = import('../../lib/business-account').BusinessRowWithParent & {
  tier?: string | null
  business_name?: string | null
  slug?: string | null
  [key: string]: unknown
}

/**
 * Returns the primary business for the logged-in user and all locations in the account.
 * If user_id lookup fails, finds by owner_email and auto-updates user_id.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Vary', 'Authorization')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('[my-business] auth.getUser failed:', authError?.message, authError?.status)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    let rows: BusinessRow[] = []
    const fetchRows = async (select: string) =>
      supabaseAdmin.from('businesses').select(select).eq('user_id', user.id)

    let { data: rowsByUser, error: userErr } = await fetchRows(BUSINESS_SELECT)
    if (userErr && /parent_business_id|column|does not exist/i.test(String(userErr.message || ''))) {
      const legacy = await fetchRows(BUSINESS_SELECT_LEGACY)
      rowsByUser = legacy.data
      userErr = legacy.error
    }

    if (userErr) {
      console.error('[my-business] user_id lookup error:', userErr.message, userErr.code)
    }

    rows = (rowsByUser || []) as unknown as BusinessRow[]

    if (!rows.length && user.email) {
      const emailTrimmed = user.email.trim().toLowerCase()
      const emailFetch = await supabaseAdmin
        .from('businesses')
        .select(BUSINESS_SELECT)
        .ilike('owner_email', emailTrimmed)
      let byEmail = emailFetch.data as unknown as BusinessRow[] | null
      let emailError = emailFetch.error
      if (emailError && /parent_business_id|column|does not exist/i.test(String(emailError.message || ''))) {
        const leg = await supabaseAdmin
          .from('businesses')
          .select(BUSINESS_SELECT_LEGACY)
          .ilike('owner_email', emailTrimmed)
        byEmail = leg.data as unknown as BusinessRow[] | null
        emailError = leg.error
      }

      if (emailError) {
        console.error('[my-business] owner_email lookup error:', emailError)
      }
      if (byEmail?.length) {
        await supabaseAdmin
          .from('businesses')
          .update({ user_id: user.id })
          .ilike('owner_email', emailTrimmed)
        let healed = (await supabaseAdmin.from('businesses').select(BUSINESS_SELECT).eq('user_id', user.id))
          .data as unknown as BusinessRow[] | null
        if (!healed) {
          healed = (await supabaseAdmin.from('businesses').select(BUSINESS_SELECT_LEGACY).eq('user_id', user.id))
            .data as unknown as BusinessRow[] | null
        }
        rows = healed || []
      }
    }

    if (!rows.length) {
      return res.status(200).json({ business: null, locations: [], maxLocations: 1 })
    }

    const primary = pickPrimaryBusinessRow(rows)
    if (!primary) {
      return res.status(200).json({ business: null, locations: [], maxLocations: 1 })
    }

    const tier = (primary.tier as 'free' | 'pro' | 'ai' | undefined) || 'free'
    const maxLocations = getMaxBusinessLocations(tier)

    const summaries = rows.map((r) => ({
      id: String(r.id),
      business_name: String(r.business_name ?? ''),
      slug: String(r.slug ?? ''),
      is_primary: r.id === primary.id,
    }))

    const ordered = [
      summaries.find((s) => s.is_primary)!,
      ...sortLocationSummaries(summaries.filter((s) => !s.is_primary)),
    ]

    return res.status(200).json({
      business: primary,
      locations: ordered,
      maxLocations,
    })
  } catch (error) {
    console.error('[my-business] Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
