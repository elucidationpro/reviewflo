/**
 * POST /api/analytics/export-case-study
 * Generates a case study HTML document for download.
 * Returns HTML string that the client can print-to-PDF or download.
 *
 * Body: { days: 30|60|90, testimonial?: string, period?: string }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TIER_COST: Record<string, number> = { free: 0, pro: 19, ai: 49 }

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, tier')
      .eq('user_id', user.id)
      .single()
    if (!business) return res.status(404).json({ error: 'Business not found' })

    const days: number = [30, 60, 90].includes(parseInt(String(req.body.days))) ? parseInt(String(req.body.days)) : 30
    const testimonial: string = (req.body.testimonial || '').trim()

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startIso = startDate.toISOString()
    const startDateStr = startDate.toISOString().split('T')[0]
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const periodLabel = `Last ${days} Days`

    // ── Fetch data ──────────────────────────────────────────────

    // Funnel
    const { data: requests } = await supabaseAdmin
      .from('review_requests')
      .select('status')
      .eq('business_id', business.id)
      .gte('sent_at', startIso)

    const allRequests = requests || []
    const sent = allRequests.length
    const opened = allRequests.filter((r) => ['opened', 'clicked', 'completed', 'feedback'].includes(r.status)).length
    const completed = allRequests.filter((r) => r.status === 'completed').length
    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0
    const completionRate = sent > 0 ? Math.round((completed / sent) * 100) : 0

    // Google stats (before/after)
    const { data: latestSnap } = await supabaseAdmin
      .from('google_business_snapshots')
      .select('total_reviews, average_rating, snapshot_date')
      .eq('business_id', business.id)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    const { data: earliestSnap } = await supabaseAdmin
      .from('google_business_snapshots')
      .select('total_reviews, average_rating, snapshot_date')
      .eq('business_id', business.id)
      .gte('snapshot_date', startDateStr)
      .order('snapshot_date', { ascending: true })
      .limit(1)
      .single()

    const reviewGrowth = (latestSnap && earliestSnap)
      ? latestSnap.total_reviews - earliestSnap.total_reviews
      : null
    const ratingChange = (latestSnap && earliestSnap)
      ? parseFloat((latestSnap.average_rating - earliestSnap.average_rating).toFixed(2))
      : null

    // Revenue
    const monthStart = new Date()
    monthStart.setDate(1)
    const { data: monthSummary } = await supabaseAdmin
      .from('monthly_attribution_summary')
      .select('google_review_revenue, total_revenue, attribution_percentage, google_review_customers')
      .eq('business_id', business.id)
      .eq('month', monthStart.toISOString().split('T')[0])
      .single()

    const googleRevenue = monthSummary?.google_review_revenue || 0

    // ── Generate HTML ───────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escHtml(business.business_name)} — ReviewFlo Case Study</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; background: #fff; }
  .page { max-width: 760px; margin: 0 auto; padding: 48px 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #f0f0f0; }
  .brand { font-size: 13px; font-weight: 700; color: #9ca3af; letter-spacing: 0.1em; text-transform: uppercase; }
  .business { font-size: 26px; font-weight: 800; color: #111; margin-top: 6px; }
  .period { text-align: right; }
  .period-label { font-size: 13px; color: #6b7280; }
  .period-value { font-size: 15px; font-weight: 600; color: #374151; margin-top: 2px; }
  .section { margin-bottom: 36px; }
  .section-title { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 16px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .kpi { background: #f9fafb; border-radius: 12px; padding: 16px 18px; }
  .kpi-value { font-size: 28px; font-weight: 800; color: #111; }
  .kpi-value.accent { color: #d97706; }
  .kpi-value.green { color: #059669; }
  .kpi-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .kpi-delta { font-size: 12px; font-weight: 600; color: #059669; margin-top: 2px; }
  .kpi-delta.neg { color: #dc2626; }
  .funnel { display: flex; align-items: center; gap: 0; flex-wrap: wrap; margin-top: 4px; }
  .funnel-step { text-align: center; padding: 12px 16px; background: #f3f4f6; border-radius: 8px; min-width: 90px; }
  .funnel-step-val { font-size: 22px; font-weight: 800; color: #111; }
  .funnel-step-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .funnel-step-pct { font-size: 11px; font-weight: 600; color: #059669; margin-top: 1px; }
  .funnel-arrow { color: #d1d5db; font-size: 20px; padding: 0 6px; }
  .testimonial { background: #fffbeb; border-left: 4px solid #fbbf24; border-radius: 0 12px 12px 0; padding: 20px 24px; margin-top: 8px; }
  .testimonial-quote { font-size: 15px; font-style: italic; color: #374151; line-height: 1.6; }
  .testimonial-author { font-size: 12px; color: #9ca3af; margin-top: 8px; font-weight: 600; }
  .comparison { display: flex; align-items: center; gap: 24px; background: #f0fdf4; border-radius: 12px; padding: 20px 24px; }
  .comp-item { text-align: center; }
  .comp-value { font-size: 24px; font-weight: 800; }
  .comp-value.reviewflo { color: #059669; }
  .comp-value.podium { color: #9ca3af; text-decoration: line-through; }
  .comp-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .comp-save { background: #dcfce7; color: #166534; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-left: auto; }
  .footer { border-top: 1px solid #f0f0f0; margin-top: 40px; padding-top: 16px; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 13px; font-weight: 700; color: #9ca3af; }
  .footer-date { font-size: 12px; color: #d1d5db; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand">ReviewFlo Case Study</div>
      <div class="business">${escHtml(business.business_name)}</div>
    </div>
    <div class="period">
      <div class="period-label">Reporting Period</div>
      <div class="period-value">${periodLabel}</div>
      <div class="period-label" style="margin-top:4px;">${today}</div>
    </div>
  </div>

  <!-- Review Funnel -->
  <div class="section">
    <div class="section-title">Review Request Funnel</div>
    <div class="funnel">
      <div class="funnel-step">
        <div class="funnel-step-val">${sent}</div>
        <div class="funnel-step-label">Sent</div>
      </div>
      <div class="funnel-arrow">›</div>
      <div class="funnel-step">
        <div class="funnel-step-val">${opened}</div>
        <div class="funnel-step-label">Opened</div>
        ${sent > 0 ? `<div class="funnel-step-pct">${openRate}%</div>` : ''}
      </div>
      <div class="funnel-arrow">›</div>
      <div class="funnel-step" style="background:#fef3c7;">
        <div class="funnel-step-val">${completed}</div>
        <div class="funnel-step-label">Completed</div>
        ${sent > 0 ? `<div class="funnel-step-pct">${completionRate}%</div>` : ''}
      </div>
    </div>
  </div>

  <!-- Google Stats -->
  ${latestSnap ? `
  <div class="section">
    <div class="section-title">Google Business Profile</div>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-value accent">${latestSnap.average_rating.toFixed(1)}★</div>
        <div class="kpi-label">Current Rating</div>
        ${ratingChange !== null && ratingChange !== 0 ? `<div class="kpi-delta ${ratingChange < 0 ? 'neg' : ''}">${ratingChange > 0 ? '+' : ''}${ratingChange} vs ${days}d ago</div>` : ''}
      </div>
      <div class="kpi">
        <div class="kpi-value">${latestSnap.total_reviews}</div>
        <div class="kpi-label">Total Reviews</div>
        ${reviewGrowth !== null && reviewGrowth > 0 ? `<div class="kpi-delta">+${reviewGrowth} this period</div>` : ''}
      </div>
      ${earliestSnap ? `
      <div class="kpi">
        <div class="kpi-value">${earliestSnap.average_rating.toFixed(1)}★</div>
        <div class="kpi-label">Rating ${days} Days Ago</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${earliestSnap.total_reviews}</div>
        <div class="kpi-label">Reviews ${days} Days Ago</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <!-- Revenue Attribution -->
  ${monthSummary ? `
  <div class="section">
    <div class="section-title">Revenue Attribution (This Month)</div>
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-value green">${fmt$(googleRevenue)}</div>
        <div class="kpi-label">From Google Reviews</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${fmt$(monthSummary.total_revenue)}</div>
        <div class="kpi-label">Total Revenue</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${monthSummary.attribution_percentage}%</div>
        <div class="kpi-label">From Reviews</div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Testimonial -->
  ${testimonial ? `
  <div class="section">
    <div class="section-title">Customer Testimonial</div>
    <div class="testimonial">
      <div class="testimonial-quote">"${escHtml(testimonial)}"</div>
      <div class="testimonial-author">— ${escHtml(business.business_name)} Customer</div>
    </div>
  </div>
  ` : ''}

  <!-- Podium Comparison -->
  <div class="section">
    <div class="section-title">Cost Comparison</div>
    <div class="comparison">
      <div class="comp-item">
        <div class="comp-value reviewflo">${fmt$(monthlyCost)}/mo</div>
        <div class="comp-label">ReviewFlo (${business.tier})</div>
      </div>
      <div style="color:#d1d5db; font-size:18px;">vs</div>
      <div class="comp-item">
        <div class="comp-value podium">$399/mo</div>
        <div class="comp-label">Podium Essentials</div>
      </div>
      <div class="comp-save">You save ${fmt$(399 - monthlyCost)}/month</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">Powered by ReviewFlo • usereviewflo.com</div>
    <div class="footer-date">Generated ${today}</div>
  </div>
</div>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="reviewflo-case-study-${business.business_name.replace(/\s+/g, '-').toLowerCase()}.html"`)
    return res.status(200).send(html)
  } catch (err) {
    console.error('[export-case-study] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
