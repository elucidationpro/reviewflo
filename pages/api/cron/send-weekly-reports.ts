/**
 * Cron: Send Weekly Performance Reports
 * Schedule: 0 9 * * 1 (every Monday at 9am)
 *
 * Sends each Pro/AI business a summary of last week's performance.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const resend = new Resend(process.env.RESEND_API_KEY)
const CRON_SECRET = process.env.CRON_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'

interface Business {
  id: string
  business_name: string
  tier: string
  user_id: string
}

interface UserRecord {
  email: string
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildWeeklyEmail(params: {
  businessName: string
  requestsSent: number
  requestsOpened: number
  openRate: number
  requestsCompleted: number
  completionRate: number
  googleRating: number | null
  totalReviews: number | null
  newReviewsWeek: number
  ratingChangeWeek: number
  dashboardUrl: string
}): string {
  const {
    businessName, requestsSent, requestsOpened, openRate,
    requestsCompleted, completionRate, googleRating, totalReviews,
    newReviewsWeek, ratingChangeWeek, dashboardUrl
  } = params

  const hasGoogleStats = googleRating !== null

  const getEncouragement = () => {
    if (requestsCompleted >= 5) return "🔥 Strong week! Keep the momentum going."
    if (requestsCompleted >= 2) return "👍 Good progress. A few more sends this week could really add up."
    if (requestsSent === 0) return "📤 Try sending a few review requests this week — it only takes 30 seconds each."
    return "💪 Every request counts. Keep it up!"
  }

  const ratingDeltaHtml = ratingChangeWeek !== 0
    ? `<span style="color:${ratingChangeWeek > 0 ? '#059669' : '#dc2626'}; font-weight:600;">${ratingChangeWeek > 0 ? '▲' : '▼'}${Math.abs(ratingChangeWeek)} this week</span>`
    : ''

  const newReviewsHtml = newReviewsWeek > 0
    ? `<span style="color:#059669; font-weight:600;">+${newReviewsWeek} new this week</span>`
    : `<span style="color:#9ca3af;">No new reviews tracked</span>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your ReviewFlo Weekly Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
  .card { background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
  .header { background: #4A3428; color: white; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .header p { margin: 4px 0 0; font-size: 14px; opacity: 0.8; }
  .body { padding: 28px 32px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 12px; }
  .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .stat { background: #f9fafb; border-radius: 10px; padding: 14px 16px; }
  .stat-value { font-size: 26px; font-weight: 800; color: #111; }
  .stat-label { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .encouragement { background: #fef3c7; border-radius: 10px; padding: 14px 16px; font-size: 14px; color: #92400e; }
  .cta { display: inline-block; background: #4A3428; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 8px; }
  .footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 20px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>📊 Your Weekly Report</h1>
      <p>${escHtml(businessName)} • ReviewFlo</p>
    </div>
    <div class="body">

      <!-- Funnel section -->
      <div class="section">
        <div class="section-title">Review Requests — This Week</div>
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-value">${requestsSent}</div>
            <div class="stat-label">Requests Sent</div>
          </div>
          <div class="stat">
            <div class="stat-value">${requestsOpened}</div>
            <div class="stat-label">Opened (${openRate}%)</div>
          </div>
          <div class="stat">
            <div class="stat-value">${requestsCompleted}</div>
            <div class="stat-label">Completed (${completionRate}%)</div>
          </div>
          ${hasGoogleStats ? `
          <div class="stat">
            <div class="stat-value" style="color:#d97706;">${googleRating!.toFixed(1)}★</div>
            <div class="stat-label">Google Rating</div>
          </div>
          ` : ''}
        </div>
      </div>

      ${hasGoogleStats ? `
      <!-- Google Stats -->
      <div class="section">
        <div class="section-title">Google Business Profile</div>
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-value">${totalReviews}</div>
            <div class="stat-label">Total Reviews<br>${newReviewsHtml}</div>
          </div>
          <div class="stat">
            <div class="stat-value" style="color:#d97706;">${googleRating!.toFixed(1)}★</div>
            <div class="stat-label">Rating<br>${ratingDeltaHtml || '<span style="color:#9ca3af;">No change</span>'}</div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Encouragement -->
      <div class="section">
        <div class="encouragement">${getEncouragement()}</div>
      </div>

      <!-- CTA -->
      <div style="text-align:center; margin-top: 8px;">
        <a href="${dashboardUrl}" class="cta">View Full Dashboard →</a>
      </div>

    </div>
  </div>
  <div class="footer">
    <p>ReviewFlo • <a href="${APP_URL}/settings" style="color:#9ca3af;">Manage email preferences</a></p>
  </div>
</div>
</body>
</html>`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (CRON_SECRET && (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const startTime = Date.now()
  console.log('[send-weekly-reports] Cron started at', new Date().toISOString())

  try {
    // Get all Pro/AI businesses that have opted in to weekly reports
    const { data: businesses, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, tier, user_id')
      .in('tier', ['pro', 'ai'])
      .eq('weekly_report_emails', true)

    if (bizError) {
      console.error('[send-weekly-reports] Failed to fetch businesses:', bizError)
      return res.status(500).json({ error: 'Failed to fetch businesses' })
    }

    const allBusinesses: Business[] = businesses || []
    console.log(`[send-weekly-reports] Sending to ${allBusinesses.length} opted-in businesses`)

    const now = new Date()
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoIso = weekAgo.toISOString()

    const results = { total: allBusinesses.length, sent: 0, failed: 0 }

    for (const biz of allBusinesses) {
      try {
        // Get user email
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(biz.user_id)
        const email = authUser?.user?.email
        if (!email) {
          results.failed++
          continue
        }

        // Get this week's review requests
        const { data: weekRequests } = await supabaseAdmin
          .from('review_requests')
          .select('status')
          .eq('business_id', biz.id)
          .gte('sent_at', weekAgoIso)

        const reqs = weekRequests || []
        const sent = reqs.length
        const opened = reqs.filter((r) =>
          ['opened', 'clicked', 'completed', 'feedback'].includes(r.status)
        ).length
        const completed = reqs.filter((r) => r.status === 'completed').length
        const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0
        const completionRate = sent > 0 ? Math.round((completed / sent) * 100) : 0

        // Get latest Google snapshot
        const { data: latestSnap } = await supabaseAdmin
          .from('google_business_snapshots')
          .select('total_reviews, average_rating, reviews_this_week, rating_change_week')
          .eq('business_id', biz.id)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .single()

        // Build and send email
        const html = buildWeeklyEmail({
          businessName: biz.business_name,
          requestsSent: sent,
          requestsOpened: opened,
          openRate,
          requestsCompleted: completed,
          completionRate,
          googleRating: latestSnap?.average_rating ?? null,
          totalReviews: latestSnap?.total_reviews ?? null,
          newReviewsWeek: latestSnap?.reviews_this_week ?? 0,
          ratingChangeWeek: latestSnap?.rating_change_week ?? 0,
          dashboardUrl: `${APP_URL}/dashboard/analytics`,
        })

        const { error: sendError } = await resend.emails.send({
          from: 'ReviewFlo <reports@usereviewflo.com>',
          to: email,
          subject: `Your ReviewFlo Weekly Report — ${biz.business_name}`,
          html,
        })

        if (sendError) {
          console.error(`[send-weekly-reports] Send failed for ${biz.id}:`, sendError)
          results.failed++
        } else {
          results.sent++
          console.log(`[send-weekly-reports] ✓ Sent to ${email} (${biz.business_name})`)
        }

        // Small delay between sends
        await new Promise((r) => setTimeout(r, 100))
      } catch (bizErr) {
        console.error(`[send-weekly-reports] Error for business ${biz.id}:`, bizErr)
        results.failed++
      }
    }

    const duration = Date.now() - startTime
    console.log(`[send-weekly-reports] Done in ${duration}ms:`, results)

    return res.status(200).json({ success: true, ...results, duration_ms: duration })
  } catch (err) {
    console.error('[send-weekly-reports] Fatal error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
