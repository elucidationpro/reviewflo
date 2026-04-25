import type { NextApiRequest, NextApiResponse } from 'next'
import {
  apiError,
  apiSuccess,
  getAuthContext,
  parseTier,
  supabaseAdmin,
} from '../../../lib/api-utils'
import { canUseCampaigns } from '../../../lib/tier-permissions'
import { parseCsv, normalizeContacts, type NormalizedContact } from '../../../lib/csv-parse'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
}

interface UploadBody {
  csv?: string
  businessId?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return apiError(res, 405, 'Method not allowed')

  const ctx = await getAuthContext(req, res, 'id, business_name, tier')
  if (!ctx) return
  const business = ctx.business as { id: string; tier: string | null }
  const tier = parseTier(business.tier)
  if (!canUseCampaigns(tier)) {
    return apiError(res, 403, 'Pro or AI tier required for campaigns')
  }

  const { csv } = (req.body as UploadBody) || {}
  if (!csv || typeof csv !== 'string') {
    return apiError(res, 400, 'csv (string) is required in request body')
  }
  if (csv.length > 4 * 1024 * 1024) {
    return apiError(res, 413, 'CSV too large (max 4MB)')
  }

  let parsed
  try {
    parsed = parseCsv(csv)
  } catch (err) {
    console.error('[upload-csv] Parse error:', err)
    return apiError(res, 400, 'Failed to parse CSV')
  }

  const total_rows = parsed.rows.length
  const { contacts: normalized, skipped_missing, skipped_invalid_email } = normalizeContacts(
    parsed.rows
  )

  // Dedupe within the batch (email > phone). Keep first occurrence.
  const seenEmails = new Set<string>()
  const seenPhones = new Set<string>()
  const intraBatchDeduped: NormalizedContact[] = []
  let skipped_intra_duplicate = 0
  for (const c of normalized) {
    const key = c.email ? `e:${c.email}` : c.phone ? `p:${c.phone}` : ''
    if (!key) continue
    if (c.email && seenEmails.has(c.email)) {
      skipped_intra_duplicate++
      continue
    }
    if (!c.email && c.phone && seenPhones.has(c.phone)) {
      skipped_intra_duplicate++
      continue
    }
    if (c.email) seenEmails.add(c.email)
    if (c.phone) seenPhones.add(c.phone)
    intraBatchDeduped.push(c)
  }

  // Look up existing campaign_contacts for this business and exclude.
  const emails = intraBatchDeduped.map((c) => c.email).filter((e): e is string => !!e)
  const phones = intraBatchDeduped.map((c) => c.phone).filter((p): p is string => !!p)

  const existingEmails = new Set<string>()
  const existingPhones = new Set<string>()
  if (emails.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('campaign_contacts')
      .select('email')
      .eq('business_id', business.id)
      .in('email', emails)
    if (error) {
      console.error('[upload-csv] dedupe-existing-email error:', error)
      return apiError(res, 500, 'Failed to check existing contacts')
    }
    for (const row of data ?? []) if (row.email) existingEmails.add(row.email)
  }
  if (phones.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('campaign_contacts')
      .select('phone')
      .eq('business_id', business.id)
      .in('phone', phones)
    if (error) {
      console.error('[upload-csv] dedupe-existing-phone error:', error)
      return apiError(res, 500, 'Failed to check existing contacts')
    }
    for (const row of data ?? []) if (row.phone) existingPhones.add(row.phone)
  }

  // Look up unsubscribes for this business.
  const unsubEmails = new Set<string>()
  const unsubPhones = new Set<string>()
  if (emails.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('unsubscribes')
      .select('email')
      .eq('business_id', business.id)
      .in('email', emails)
    if (error) {
      console.error('[upload-csv] unsub-email error:', error)
      return apiError(res, 500, 'Failed to check unsubscribes')
    }
    for (const row of data ?? []) if (row.email) unsubEmails.add(row.email)
  }
  if (phones.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('unsubscribes')
      .select('phone')
      .eq('business_id', business.id)
      .in('phone', phones)
    if (error) {
      console.error('[upload-csv] unsub-phone error:', error)
      return apiError(res, 500, 'Failed to check unsubscribes')
    }
    for (const row of data ?? []) if (row.phone) unsubPhones.add(row.phone)
  }

  let skipped_duplicates = 0
  let skipped_unsubscribes = 0
  const finalContacts: NormalizedContact[] = []
  for (const c of intraBatchDeduped) {
    const isDup =
      (c.email && existingEmails.has(c.email)) || (c.phone && existingPhones.has(c.phone))
    const isUnsub =
      (c.email && unsubEmails.has(c.email)) || (c.phone && unsubPhones.has(c.phone))
    if (isUnsub) {
      skipped_unsubscribes++
      continue
    }
    if (isDup) {
      skipped_duplicates++
      continue
    }
    finalContacts.push(c)
  }

  return apiSuccess(res, {
    total_rows,
    valid_contacts: finalContacts.length,
    skipped_missing,
    skipped_invalid_email,
    skipped_intra_duplicate,
    skipped_duplicates,
    skipped_unsubscribes,
    preview: finalContacts.slice(0, 5),
    contacts: finalContacts,
  })
}
