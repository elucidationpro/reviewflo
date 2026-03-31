/**
 * GET /api/admin/all-analytics
 * Aggregates analytics across all businesses for admin view.
 * Requires admin authentication.
 *
 * Query params:
 *   - tier: free|pro|ai (optional filter)
 *   - days: 7|30|90 (default 30)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../lib/adminAuth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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
    if (authError || !user || !isAdminUser(user)) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const days = Math.min(Math.max(parseInt(String(req.query.days || '30'), 10), 7), 90)
    const tierFilter = req.query.tier as string | undefined
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startIso = startDate.toISOString()
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStartStr = monthStart.toISOString().split('T')[0]

    // ── Get all businesses ───────────────────────────────────────
    let bizQuery = supabaseAdmin
      .from('businesses')
      .select('id, business_name, tier, created_at, google_place_id, google_oauth_refresh_token')
      .order('created_at', { ascending: false })

    if (tierFilter && ['free', 'pro', 'ai'].includes(tierFilter)) {
      bizQuery = bizQuery.eq('tier', tierFilter)
    }

    const { data: businesses, error: bizError } = await bizQuery
    if (bizError) return res.status(500).json({ error: 'Failed to fetch businesses' })

    const allBusinesses = businesses || []
    const businessIds = allBusinesses.map((b) => b.id)

    // ── Get review request stats per business ─────────────────────
    const { data: allRequests } = await supabaseAdmin
      .from('review_requests')
      .select('business_id, status')
      .in('business_id', businessIds)
      .gte('sent_at', startIso)

    const requestsByBusiness: Record<string, typeof allRequests> = {}
    ;(allRequests || []).forEach((r) => {
      if (!requestsByBusiness[r.business_id]) requestsByBusiness[r.business_id] = []
      requestsByBusiness[r.business_id]!.push(r)
    })

    // ── Get latest Google snapshots per business ──────────────────
    const { data: snapshots } = await supabaseAdmin
      .from('google_business_snapshots')
      .select('business_id, total_reviews, average_rating, reviews_this_month, rating_change_month, snapshot_date')
      .in('business_id', businessIds)
      .order('snapshot_date', { ascending: false })

    // Keep only the latest snapshot per business
    type Snapshot = {
      business_id: string
      total_reviews: number
      average_rating: number
      reviews_this_month: number | null
      rating_change_month: number | null
      snapshot_date: string
    }
    const latestSnapshotByBusiness: Record<string, Snapshot> = {}
    ;(snapshots || []).forEach((s) => {
      if (!latestSnapshotByBusiness[s.business_id]) {
        latestSnapshotByBusiness[s.business_id] = s as Snapshot
      }
    })

    // ── Get monthly revenue attribution per business ──────────────
    const { data: monthlySummaries } = await supabaseAdmin
      .from('monthly_attribution_summary')
      .select('business_id, google_review_revenue, total_revenue, attribution_percentage')
      .in('business_id', businessIds)
      .eq('month', monthStartStr)

    type MonthlySummary = {
      business_id: string
      google_review_revenue: number
      total_revenue: number
      attribution_percentage: number
    }
    const summaryByBusiness: Record<string, MonthlySummary> = {}
    ;(monthlySummaries || []).forEach((s) => {
      summaryByBusiness[s.business_id] = s as MonthlySummary
    })

    // ── Assemble per-business analytics ───────────────────────────
    const TIER_COST: Record<string, number> = { free: 0, pro: 19, ai: 49 }

    const analytics = allBusinesses.map((biz) => {
      const reqs = requestsByBusiness[biz.id] || []
      const sent = reqs.length
      const completed = reqs.filter((r) => r.status === 'completed').length
      const conversionRate = sent > 0 ? Math.round((completed / sent) * 100) : 0

      const snap = latestSnapshotByBusiness[biz.id]
      const revSummary = summaryByBusiness[biz.id]

      const monthlyCost = TIER_COST[biz.tier] || 0
      const googleRevenue = parseFloat(String(revSummary?.google_review_revenue || 0))
      const roi = monthlyCost > 0
        ? Math.round(((googleRevenue - monthlyCost) / monthlyCost) * 100)
        : null

      return {
        businessId: biz.id,
        businessName: biz.business_name,
        tier: biz.tier,
        hasGoogleConnected: !!(biz.google_place_id || biz.google_oauth_refresh_token),
        // Funnel
        requestsSent: sent,
        requestsCompleted: completed,
        conversionRate,
        // Google
        currentRating: snap?.average_rating ?? null,
        totalReviews: snap?.total_reviews ?? null,
        reviewsThisMonth: snap?.reviews_this_month ?? null,
        ratingChangeMonth: snap?.rating_change_month ?? null,
        // Revenue
        googleRevenue,
        totalRevenue: parseFloat(String(revSummary?.total_revenue || 0)),
        attributionPct: parseFloat(String(revSummary?.attribution_percentage || 0)),
        // ROI
        roi,
        monthlyCost,
      }
    })

    // ── Aggregate summary stats ───────────────────────────────────
    const aggregates = {
      totalBusinesses: analytics.length,
      byTier: {
        free: analytics.filter((a) => a.tier === 'free').length,
        pro: analytics.filter((a) => a.tier === 'pro').length,
        ai: analytics.filter((a) => a.tier === 'ai').length,
      },
      totalRequestsSent: analytics.reduce((s, a) => s + a.requestsSent, 0),
      avgConversionRate: analytics.length > 0
        ? Math.round(analytics.reduce((s, a) => s + a.conversionRate, 0) / analytics.length)
        : 0,
      totalGoogleRevenue: analytics.reduce((s, a) => s + a.googleRevenue, 0),
      businessesWithGoogleConnected: analytics.filter((a) => a.hasGoogleConnected).length,
    }

    return res.status(200).json({
      analytics,
      aggregates,
      dateRange: { days, startDate: startIso },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[admin/all-analytics] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
