import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import {
  apiError,
  apiSuccess,
  getAuthContext,
  parseTier,
  supabaseAdmin,
} from '../../../lib/api-utils'
import { canUseCampaigns, getMaxCampaignContacts } from '../../../lib/tier-permissions'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
}

interface IncomingContact {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
}

interface CreateBody {
  businessId?: string
  name?: string
  send_window_days?: number
  sends_per_day?: number
  message_template?: string
  send_time?: string
  contacts?: IncomingContact[]
}

const DEFAULT_TEMPLATE = `Hi {first_name},

We wanted to reach out and say thank you for being a customer of {business_name}.

If you've had a great experience with us, we'd really appreciate it if you'd take a moment to share it on Google — it helps other customers find us and means a lot to our small business.

Leave a Google review: {google_review_link}

If you've already left us a review or feedback, no need to do anything — we just wanted to say thanks!

{business_name}`

/**
 * Distribute N contacts across `send_window_days` at up to `sends_per_day` per day,
 * within a 16:00-18:00 UTC window (10am-12pm MT). Adds small jitter per slot so two
 * sends are never to the millisecond.
 */
function computeSchedule(
  count: number,
  sendsPerDay: number,
  now: Date
): Date[] {
  const result: Date[] = []
  const startOfDayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
  )

  // Window: 16:00 → 18:00 UTC
  const WINDOW_START_HOUR = 16
  const WINDOW_DURATION_MIN = 120
  const slotSpacingMin = sendsPerDay > 0 ? Math.floor(WINDOW_DURATION_MIN / sendsPerDay) : 0

  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(i / sendsPerDay)
    const slotIndex = i % sendsPerDay
    const day = new Date(startOfDayUtc)
    day.setUTCDate(day.getUTCDate() + dayOffset)
    day.setUTCHours(WINDOW_START_HOUR, 0, 0, 0)
    const offsetMs = slotIndex * slotSpacingMin * 60_000
    const jitterMs = Math.floor(Math.random() * 60_000) // up to 60s
    let slot = new Date(day.getTime() + offsetMs + jitterMs)

    // For the very first send (today, slot 0), ensure it's at least ~2 minutes from now.
    if (dayOffset === 0 && slotIndex === 0) {
      const earliest = new Date(now.getTime() + 2 * 60_000)
      if (slot.getTime() < earliest.getTime()) slot = earliest
    }

    result.push(slot)
  }

  return result
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return apiError(res, 405, 'Method not allowed')

  const ctx = await getAuthContext(req, res, 'id, business_name, tier')
  if (!ctx) return
  const business = ctx.business as { id: string; business_name: string; tier: string | null }
  const tier = parseTier(business.tier)
  if (!canUseCampaigns(tier)) {
    return apiError(res, 403, 'Campaigns are coming soon', { code: 'campaigns_disabled' })
  }

  const body = (req.body as CreateBody) || {}
  const name = (body.name ?? '').trim()
  const send_window_days = Number(body.send_window_days)
  const sends_per_day = Number(body.sends_per_day)
  const message_template = (body.message_template ?? '').trim() || DEFAULT_TEMPLATE
  const send_time = (body.send_time ?? '10:00').trim()
  const contacts = Array.isArray(body.contacts) ? body.contacts : []

  if (!name || name.length > 120) {
    return apiError(res, 400, 'name is required (1-120 chars)')
  }
  if (!Number.isFinite(send_window_days) || send_window_days < 1 || send_window_days > 90) {
    return apiError(res, 400, 'send_window_days must be 1-90')
  }
  if (!Number.isFinite(sends_per_day) || sends_per_day < 1 || sends_per_day > 10) {
    return apiError(res, 400, 'sends_per_day must be 1-10')
  }
  if (!message_template || message_template.length > 4000) {
    return apiError(res, 400, 'message_template is required (max 4000 chars)')
  }
  if (!/^\d{2}:\d{2}$/.test(send_time)) {
    return apiError(res, 400, 'send_time must be HH:MM')
  }
  if (contacts.length === 0) {
    return apiError(res, 400, 'contacts must contain at least one row')
  }

  const limit = getMaxCampaignContacts(tier)
  if (contacts.length > limit) {
    return apiError(res, 403, 'Contact limit exceeded for your tier', {
      limit: Number.isFinite(limit) ? limit : null,
      actual: contacts.length,
    })
  }

  // Validate contact shape.
  const cleaned: IncomingContact[] = []
  for (const c of contacts) {
    if (!c) continue
    const email = c.email ? String(c.email).trim().toLowerCase() : null
    const phone = c.phone ? String(c.phone).trim() : null
    if (!email && !phone) continue
    cleaned.push({
      first_name: c.first_name ? String(c.first_name).trim().slice(0, 80) : null,
      last_name: c.last_name ? String(c.last_name).trim().slice(0, 80) : null,
      email,
      phone,
    })
  }
  if (cleaned.length === 0) {
    return apiError(res, 400, 'No valid contacts (each needs email or phone)')
  }

  const now = new Date()
  const { data: campaignRow, error: campaignErr } = await supabaseAdmin
    .from('campaigns')
    .insert({
      business_id: business.id,
      name,
      status: 'active',
      total_contacts: cleaned.length,
      send_window_days,
      sends_per_day,
      message_template,
      send_time,
      started_at: now.toISOString(),
    })
    .select('id, started_at')
    .single()

  if (campaignErr || !campaignRow) {
    console.error('[campaigns/create] Insert campaign error:', campaignErr)
    return apiError(res, 500, 'Failed to create campaign')
  }

  const schedule = computeSchedule(cleaned.length, sends_per_day, now)
  const rows = cleaned.map((c, i) => ({
    campaign_id: campaignRow.id,
    business_id: business.id,
    first_name: c.first_name ?? null,
    last_name: c.last_name ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    status: 'pending' as const,
    scheduled_for: schedule[i].toISOString(),
    tracking_token: crypto.randomUUID(),
  }))

  // Insert in chunks of 500 to stay under PostgREST limits.
  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    const { error: insertErr } = await supabaseAdmin.from('campaign_contacts').insert(slice)
    if (insertErr) {
      console.error('[campaigns/create] Insert contacts error:', insertErr)
      // Roll back: delete campaign + any contacts inserted so far.
      await supabaseAdmin.from('campaign_contacts').delete().eq('campaign_id', campaignRow.id)
      await supabaseAdmin.from('campaigns').delete().eq('id', campaignRow.id)
      return apiError(res, 500, 'Failed to schedule contacts')
    }
  }

  console.log(
    `[CAMPAIGN] Created campaign ${campaignRow.id} for business ${business.id} with ${cleaned.length} contacts`
  )

  return apiSuccess(res, {
    id: campaignRow.id,
    started_at: campaignRow.started_at,
    total_contacts: cleaned.length,
    scheduled_first: schedule[0].toISOString(),
    scheduled_last: schedule[schedule.length - 1].toISOString(),
  })
}
