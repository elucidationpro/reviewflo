import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Tier = 'free' | 'pro' | 'ai'

function getDailyLimitForTier(tier: Tier): number {
  if (tier === 'free') return 5
  return 10
}

function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function clampDate(d: Date, min: Date, max: Date): Date {
  return new Date(Math.min(Math.max(d.getTime(), min.getTime()), max.getTime()))
}

function computeSlotTimeUtc(dayStartUtc: Date, slotIndex: number, dailyLimit: number): Date {
  // Schedule within a 9am–6pm "business hours" window in UTC.
  // (If/when we store business timezone, we should convert these to local time.)
  const windowStart = new Date(dayStartUtc)
  windowStart.setUTCHours(9, 0, 0, 0)
  const windowEnd = new Date(dayStartUtc)
  windowEnd.setUTCHours(18, 0, 0, 0)

  const windowMs = Math.max(0, windowEnd.getTime() - windowStart.getTime())
  const spacingMs = dailyLimit > 0 ? Math.floor(windowMs / dailyLimit) : windowMs
  const base = windowStart.getTime() + slotIndex * spacingMs
  const jitter = Math.min(5 * 60_000, Math.floor(spacingMs / 2)) // up to 5m or half-slot

  return new Date(base + (jitter > 0 ? Math.floor(Math.random() * jitter) : 0))
}

async function countForDay(
  supabaseAdmin: SupabaseClient,
  businessId: string,
  dayStartUtcIso: string,
  dayEndUtcIso: string
): Promise<{ sent: number; scheduled: number }> {
  const [sentRes, scheduledRes] = await Promise.all([
    supabaseAdmin
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('send_status', 'sent')
      .gte('sent_at', dayStartUtcIso)
      .lt('sent_at', dayEndUtcIso),
    supabaseAdmin
      .from('review_requests')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('send_status', 'scheduled')
      .gte('scheduled_for', dayStartUtcIso)
      .lt('scheduled_for', dayEndUtcIso),
  ])

  if (sentRes.error) throw sentRes.error
  if (scheduledRes.error) throw scheduledRes.error

  return {
    sent: sentRes.count ?? 0,
    scheduled: scheduledRes.count ?? 0,
  }
}

export type GetNextSendSlotArgs = {
  businessId: string
  tier: Tier
  supabaseAdmin?: SupabaseClient
  now?: Date
  maxDaysOut?: number
}

export async function getNextAvailableSendSlot({
  businessId,
  tier,
  supabaseAdmin,
  now = new Date(),
  maxDaysOut = 30,
}: GetNextSendSlotArgs): Promise<Date> {
  const dailyLimit = getDailyLimitForTier(tier)
  if (dailyLimit <= 0) return now

  const admin =
    supabaseAdmin ??
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

  const hardMax = addDaysUtc(now, maxDaysOut)
  const todayStart = startOfDayUtc(now)

  for (let dayOffset = 0; dayOffset <= maxDaysOut; dayOffset++) {
    const dayStart = addDaysUtc(todayStart, dayOffset)
    const dayEnd = addDaysUtc(dayStart, 1)
    const { sent, scheduled } = await countForDay(
      admin,
      businessId,
      dayStart.toISOString(),
      dayEnd.toISOString()
    )

    const used = sent + scheduled
    if (used >= dailyLimit) continue

    const slotIndex = used
    const slot = computeSlotTimeUtc(dayStart, slotIndex, dailyLimit)

    // If scheduling for today, never return a time in the past (or too soon).
    const soonest = new Date(now.getTime() + 2 * 60_000) // 2 minutes from now
    const candidate = dayOffset === 0 ? clampDate(slot, soonest, hardMax) : clampDate(slot, dayStart, hardMax)

    if (candidate.getTime() <= hardMax.getTime()) return candidate
  }

  // If everything is full, schedule at the hard max (defensive; should be rare).
  return hardMax
}

