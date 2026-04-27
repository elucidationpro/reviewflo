import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendCampaignEmail } from '../../../lib/email-service'
import { signUnsubscribeToken } from '../../../lib/campaign-tokens'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const CRON_SECRET = process.env.CRON_SECRET
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'
const CAMPAIGNS_ENABLED = process.env.CAMPAIGNS_ENABLED === 'true'

const BATCH_LIMIT = 50

interface DueRow {
  id: string
  campaign_id: string
  business_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  tracking_token: string | null
}

interface CampaignRow {
  id: string
  status: string
  message_template: string
}

interface BusinessRow {
  id: string
  business_name: string
  slug: string | null
  google_review_url: string | null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!CAMPAIGNS_ENABLED) {
    return res.status(200).json({
      success: true,
      processed: 0,
      sent: 0,
      failed: 0,
      skipped_unsubscribed: 0,
      skipped_paused: 0,
      skipped_no_email: 0,
      disabled: true,
    })
  }

  const authHeader = req.headers.authorization
  if (CRON_SECRET && (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { data: due, error } = await supabaseAdmin
      .from('campaign_contacts')
      .select(
        'id, campaign_id, business_id, first_name, last_name, email, phone, tracking_token'
      )
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(BATCH_LIMIT)

    if (error) {
      console.error('[campaigns/process-sends] Query error:', error)
      return res.status(500).json({ error: 'Failed to fetch scheduled contacts' })
    }

    if (!due || due.length === 0) {
      return res.status(200).json({
        success: true,
        processed: 0,
        sent: 0,
        failed: 0,
        skipped_unsubscribed: 0,
        skipped_paused: 0,
        skipped_no_email: 0,
      })
    }

    const dueRows = due as DueRow[]
    const campaignIds = [...new Set(dueRows.map((r) => r.campaign_id))]
    const businessIds = [...new Set(dueRows.map((r) => r.business_id))]

    const [campaignsRes, businessesRes] = await Promise.all([
      supabaseAdmin
        .from('campaigns')
        .select('id, status, message_template')
        .in('id', campaignIds),
      supabaseAdmin
        .from('businesses')
        .select('id, business_name, slug, google_review_url')
        .in('id', businessIds),
    ])

    if (campaignsRes.error) {
      console.error('[campaigns/process-sends] Campaign load error:', campaignsRes.error)
      return res.status(500).json({ error: 'Failed to load campaigns' })
    }
    if (businessesRes.error) {
      console.error('[campaigns/process-sends] Business load error:', businessesRes.error)
      return res.status(500).json({ error: 'Failed to load businesses' })
    }

    const campaignMap = new Map<string, CampaignRow>(
      ((campaignsRes.data ?? []) as CampaignRow[]).map((c) => [c.id, c])
    )
    const bizMap = new Map<string, BusinessRow>(
      ((businessesRes.data ?? []) as BusinessRow[]).map((b) => [b.id, b])
    )

    // Pre-load unsubscribes for the affected businesses + emails/phones in this batch.
    const emails = dueRows.map((r) => r.email).filter((e): e is string => !!e)
    const phones = dueRows.map((r) => r.phone).filter((p): p is string => !!p)
    const unsubscribedSet = new Set<string>() // key: `${business_id}|e:${email}` or `|p:${phone}`

    if (emails.length > 0) {
      const { data: unsubE } = await supabaseAdmin
        .from('unsubscribes')
        .select('business_id, email')
        .in('business_id', businessIds)
        .in('email', emails)
      for (const r of unsubE ?? []) if (r.email) unsubscribedSet.add(`${r.business_id}|e:${r.email}`)
    }
    if (phones.length > 0) {
      const { data: unsubP } = await supabaseAdmin
        .from('unsubscribes')
        .select('business_id, phone')
        .in('business_id', businessIds)
        .in('phone', phones)
      for (const r of unsubP ?? []) if (r.phone) unsubscribedSet.add(`${r.business_id}|p:${r.phone}`)
    }

    let sent = 0
    let failed = 0
    let skipped_unsubscribed = 0
    let skipped_paused = 0
    let skipped_no_email = 0
    const touchedCampaigns = new Set<string>()

    for (const r of dueRows) {
      touchedCampaigns.add(r.campaign_id)
      const campaign = campaignMap.get(r.campaign_id)
      const biz = bizMap.get(r.business_id)

      if (!campaign || !biz) {
        await supabaseAdmin
          .from('campaign_contacts')
          .update({ status: 'failed', error_message: 'Missing campaign or business' })
          .eq('id', r.id)
        failed++
        continue
      }

      if (campaign.status === 'paused' || campaign.status === 'completed' || campaign.status === 'draft') {
        skipped_paused++
        continue
      }

      // Re-check unsubscribes (race: someone unsubscribed after schedule was created).
      const unsubKey = r.email
        ? `${r.business_id}|e:${r.email}`
        : r.phone
        ? `${r.business_id}|p:${r.phone}`
        : ''
      if (unsubKey && unsubscribedSet.has(unsubKey)) {
        await supabaseAdmin
          .from('campaign_contacts')
          .update({ status: 'unsubscribed' })
          .eq('id', r.id)
        skipped_unsubscribed++
        continue
      }

      // V1: email only.
      if (!r.email) {
        await supabaseAdmin
          .from('campaign_contacts')
          .update({ status: 'failed', error_message: 'no email for V1' })
          .eq('id', r.id)
        skipped_no_email++
        continue
      }

      const reviewLink =
        biz.google_review_url ||
        (biz.slug ? `${BASE_URL}/${biz.slug}` : BASE_URL)
      const unsubscribeUrl = `${BASE_URL}/unsubscribe?token=${signUnsubscribeToken({
        businessId: r.business_id,
        email: r.email,
        phone: r.phone || undefined,
      })}`

      try {
        const result = await sendCampaignEmail({
          to: r.email,
          firstName: r.first_name,
          businessName: biz.business_name || 'our business',
          template: campaign.message_template,
          reviewLink,
          trackingToken: r.tracking_token || r.id,
          unsubscribeUrl,
        })

        if (result.success) {
          await supabaseAdmin
            .from('campaign_contacts')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', r.id)
          console.log(
            `[CAMPAIGN] Sent contact ${r.id} (campaign ${r.campaign_id}) → ${r.email}`
          )
          sent++
        } else {
          await supabaseAdmin
            .from('campaign_contacts')
            .update({
              status: 'failed',
              error_message: String(result.error).slice(0, 500),
            })
            .eq('id', r.id)
          console.log(
            `[CAMPAIGN] Failed contact ${r.id} (campaign ${r.campaign_id}): ${String(result.error)}`
          )
          failed++
        }
      } catch (err) {
        await supabaseAdmin
          .from('campaign_contacts')
          .update({
            status: 'failed',
            error_message: String(err instanceof Error ? err.message : err).slice(0, 500),
          })
          .eq('id', r.id)
        console.error('[campaigns/process-sends] Send threw:', r.id, err)
        failed++
      }
    }

    // For each touched campaign, mark complete if no pending rows remain.
    for (const campaignId of touchedCampaigns) {
      const { count, error: cntErr } = await supabaseAdmin
        .from('campaign_contacts')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .eq('status', 'pending')
      if (cntErr) {
        console.error('[campaigns/process-sends] pending-count error:', cntErr)
        continue
      }
      if ((count ?? 0) === 0) {
        await supabaseAdmin
          .from('campaigns')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', campaignId)
          .eq('status', 'active')
        console.log(`[CAMPAIGN] Completed campaign ${campaignId}`)
      }
    }

    return res.status(200).json({
      success: true,
      processed: dueRows.length,
      sent,
      failed,
      skipped_unsubscribed,
      skipped_paused,
      skipped_no_email,
    })
  } catch (err) {
    console.error('[campaigns/process-sends] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
