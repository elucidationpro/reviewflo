/**
 * GET /api/analytics/dashboard-data
 * Returns all analytics data needed for the analytics dashboard.
 * Aggregates: funnel metrics, Google snapshots, revenue attribution, ROI.
 *
 * Query params:
 *   - days: 7 | 30 | 90 (default 30)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { canAccessGoogleStats } from '../../../lib/tier-permissions'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Tier pricing map (monthly cost in dollars)
const TIER_COST: Record<string, number> = {
  free: 0,
  pro: 19,
  ai: 49,
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id, tier, business_name')
      .eq('user_id', user.id)
      .single()

    if (!business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    const days = Math.min(Math.max(parseInt(String(req.query.days || '30'), 10), 7), 90)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startIso = startDate.toISOString()
    const startDateStr = startDate.toISOString().split('T')[0]

    // ── 1. Review Funnel ─────────────────────────────────────────
    const { data: requests } = await supabaseAdmin
      .from('review_requests')
      .select('status, platform_selected, opened_at, clicked_at')
      .eq('business_id', business.id)
      .gte('sent_at', startIso)

    const allRequests = requests || []
    const funnelSent = allRequests.length
    const funnelOpened = allRequests.filter((r) =>
      ['opened', 'clicked', 'completed', 'feedback'].includes(r.status)
    ).length
    const funnelClicked = allRequests.filter((r) =>
      ['clicked', 'completed'].includes(r.status)
    ).length
    const funnelCompleted = allRequests.filter((r) =>
      r.status === 'completed'
    ).length
    // "Posted" = completed (we can't verify posting, so completed = sent to Google)
    const funnelPosted = funnelCompleted

    // Platform breakdown
    const platformCounts: Record<string, number> = {}
    allRequests.forEach((r) => {
      if (r.platform_selected) {
        platformCounts[r.platform_selected] = (platformCounts[r.platform_selected] || 0) + 1
      }
    })

    const funnel = {
      sent: funnelSent,
      opened: funnelOpened,
      clicked: funnelClicked,
      completed: funnelCompleted,
      posted: funnelPosted,
      openRate: funnelSent > 0 ? Math.round((funnelOpened / funnelSent) * 100) : 0,
      clickRate: funnelOpened > 0 ? Math.round((funnelClicked / funnelOpened) * 100) : 0,
      completionRate: funnelSent > 0 ? Math.round((funnelCompleted / funnelSent) * 100) : 0,
      platformBreakdown: platformCounts,
    }

    // ── 2. Google Stats (snapshots + current) ────────────────────
    let googleStats = null
    if (canAccessGoogleStats(business.tier as 'free' | 'pro' | 'ai')) {
      // Current stats
      const { data: currentStats } = await supabaseAdmin
        .from('google_business_stats')
        .select('total_reviews, average_rating, last_fetched')
        .eq('business_id', business.id)
        .single()

      // Historical snapshots for charts (last ~90 days)
      const { data: snapshots } = await supabaseAdmin
        .from('google_business_snapshots')
        .select('snapshot_date, total_reviews, average_rating, reviews_this_week, reviews_this_month, rating_change_week, rating_change_month')
        .eq('business_id', business.id)
        .gte('snapshot_date', startDateStr)
        .order('snapshot_date', { ascending: true })

      // Latest snapshot for deltas
      const { data: latestSnapshot } = await supabaseAdmin
        .from('google_business_snapshots')
        .select('reviews_this_week, reviews_this_month, rating_change_week, rating_change_month')
        .eq('business_id', business.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single()

      googleStats = {
        current: currentStats || null,
        snapshots: snapshots || [],
        deltas: latestSnapshot || {
          reviews_this_week: 0,
          reviews_this_month: 0,
          rating_change_week: 0,
          rating_change_month: 0,
        },
      }
    }

    // ── 3. Revenue Attribution ───────────────────────────────────
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const monthStart = startOfMonth.toISOString().split('T')[0]

    // Monthly summary for current month
    const { data: monthSummary } = await supabaseAdmin
      .from('monthly_attribution_summary')
      .select('*')
      .eq('business_id', business.id)
      .eq('month', monthStart)
      .single()

    // Last 6 months of summaries for chart
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const { data: monthlySummaries } = await supabaseAdmin
      .from('monthly_attribution_summary')
      .select('month, google_review_revenue, total_revenue, google_review_customers, total_customers, attribution_percentage')
      .eq('business_id', business.id)
      .gte('month', sixMonthsAgo.toISOString().split('T')[0])
      .order('month', { ascending: true })

    // Recent individual entries (last 10)
    const { data: recentSales } = await supabaseAdmin
      .from('revenue_attribution')
      .select('id, customer_name, sale_amount, sale_date, attribution_source, notes, created_at')
      .eq('business_id', business.id)
      .order('sale_date', { ascending: false })
      .limit(10)

    // Source breakdown for current month
    const { data: monthSales } = await supabaseAdmin
      .from('revenue_attribution')
      .select('attribution_source, sale_amount')
      .eq('business_id', business.id)
      .gte('sale_date', monthStart)

    const sourceBreakdown: Record<string, { count: number; revenue: number }> = {}
    ;(monthSales || []).forEach((s) => {
      if (!sourceBreakdown[s.attribution_source]) {
        sourceBreakdown[s.attribution_source] = { count: 0, revenue: 0 }
      }
      sourceBreakdown[s.attribution_source].count++
      sourceBreakdown[s.attribution_source].revenue += parseFloat(s.sale_amount)
    })

    const revenueData = {
      currentMonth: monthSummary || null,
      sourceBreakdown,
      recentSales: recentSales || [],
      history: monthlySummaries || [],
    }

    // ── 4. ROI Calculation ───────────────────────────────────────
    const monthlyCost = TIER_COST[business.tier] || 0
    const googleRevenue = monthSummary?.google_review_revenue || 0
    const roiPercent = monthlyCost > 0
      ? Math.round(((googleRevenue - monthlyCost) / monthlyCost) * 100)
      : null
    const paybackDays = googleRevenue > 0 && monthlyCost > 0
      ? Math.round((monthlyCost / (googleRevenue / 30)))
      : null

    const roi = {
      monthlyCost,
      googleRevenue: parseFloat(googleRevenue.toString()),
      roiPercent,
      paybackDays,
      tier: business.tier,
    }

    // ── 5. Assemble response ─────────────────────────────────────
    return res.status(200).json({
      businessId: business.id,
      businessName: business.business_name,
      tier: business.tier,
      dateRange: { days, startDate: startIso },
      funnel,
      googleStats,
      revenue: revenueData,
      roi,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[analytics/dashboard-data] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
