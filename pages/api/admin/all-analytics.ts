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
import {
  fetchPosthogPlatformConversions,
  fetchPosthogCustomerFlowAvgRatings,
} from '../../../lib/posthog-conversions-query'

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

    // ── Customer rating page activity (reviews / feedback rows) ──
    let periodReviews: { business_id: string; star_rating: number | null }[] | null = []
    let periodFeedback: { business_id: string }[] | null = []
    let allRequests: { business_id: string; status: string; platform_selected: string | null }[] | null = []

    if (businessIds.length > 0) {
      const reviewsRes = await supabaseAdmin
        .from('reviews')
        .select('business_id, star_rating')
        .in('business_id', businessIds)
        .gte('created_at', startIso)
      periodReviews = reviewsRes.data

      const feedbackRes = await supabaseAdmin
        .from('feedback')
        .select('business_id')
        .in('business_id', businessIds)
        .gte('created_at', startIso)
      periodFeedback = feedbackRes.data

      const requestsRes = await supabaseAdmin
        .from('review_requests')
        .select('business_id, status, platform_selected')
        .in('business_id', businessIds)
        .gte('sent_at', startIso)
      allRequests = requestsRes.data
    }

    type ReviewRow = { business_id: string; star_rating: number | null }
    type FeedbackRow = { business_id: string }

    const ratingsByBusiness: Record<string, ReviewRow[]> = {}
    ;(periodReviews ?? []).forEach((row) => {
      if (!ratingsByBusiness[row.business_id]) ratingsByBusiness[row.business_id] = []
      ratingsByBusiness[row.business_id]!.push(row as ReviewRow)
    })

    const feedbackByBusiness: Record<string, number> = {}
    ;(periodFeedback ?? []).forEach((row: FeedbackRow) => {
      feedbackByBusiness[row.business_id] = (feedbackByBusiness[row.business_id] || 0) + 1
    })

    const requestsByBusiness: Record<string, NonNullable<typeof allRequests>> = {}
    ;(allRequests ?? []).forEach((r) => {
      if (!requestsByBusiness[r.business_id]) requestsByBusiness[r.business_id] = []
      requestsByBusiness[r.business_id]!.push(r)
    })

    const [posthog, posthogFlowRatings] = await Promise.all([
      fetchPosthogPlatformConversions(startIso),
      fetchPosthogCustomerFlowAvgRatings(startIso),
    ])
    const usePosthog = posthog !== null
    const usePosthogFlowRatings = posthogFlowRatings !== null

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
      // Admin "Email conv%": dashboard review requests marked completed ÷ sent (same window)
      const conversionRate = sent > 0 ? Math.round((completed / sent) * 100) : 0

      const ratingRows = ratingsByBusiness[biz.id] || []
      const ratingTapsTotal = ratingRows.length
      const ratingTapsFiveStar = ratingRows.filter(
        (row) => Number(row.star_rating) === 5
      ).length
      const ratingTapsLowStar = ratingRows.filter(
        (row) => row.star_rating != null && Number(row.star_rating) >= 1 && Number(row.star_rating) <= 4
      ).length

      const privateFeedbackCount = feedbackByBusiness[biz.id] || 0

      // Admin "Conversions": DB = completed review_requests + platform; optional PostHog = uniq persons platform_selected
      const completedReqs = reqs.filter((r) => r.status === 'completed')
      let platformGoogle = completedReqs.filter(
        (r) => (r.platform_selected || '').toLowerCase() === 'google'
      ).length
      let platformFacebook = completedReqs.filter(
        (r) => (r.platform_selected || '').toLowerCase() === 'facebook'
      ).length
      let platformYelp = completedReqs.filter(
        (r) => (r.platform_selected || '').toLowerCase() === 'yelp'
      ).length
      let platformNextdoor = completedReqs.filter(
        (r) => (r.platform_selected || '').toLowerCase() === 'nextdoor'
      ).length
      let platformClicksTotal =
        platformGoogle + platformFacebook + platformYelp + platformNextdoor

      if (usePosthog && posthog) {
        platformClicksTotal = posthog.uniquePersons[biz.id] ?? 0
        const br = posthog.breakdown[biz.id]
        if (br) {
          platformGoogle = br.google
          platformFacebook = br.facebook
          platformYelp = br.yelp
          platformNextdoor = br.nextdoor
        } else {
          platformGoogle = 0
          platformFacebook = 0
          platformYelp = 0
          platformNextdoor = 0
        }
      }

      const fiveStarSharePct =
        ratingTapsTotal > 0 ? Math.round((ratingTapsFiveStar / ratingTapsTotal) * 100) : null

      const snap = latestSnapshotByBusiness[biz.id]
      const revSummary = summaryByBusiness[biz.id]

      const monthlyCost = TIER_COST[biz.tier] || 0
      const googleRevenue = parseFloat(String(revSummary?.google_review_revenue || 0))
      const roi = monthlyCost > 0
        ? Math.round(((googleRevenue - monthlyCost) / monthlyCost) * 100)
        : null

      const flowRow = posthogFlowRatings?.[biz.id]
      const customerFlowAvgRating =
        flowRow != null ? Math.round(flowRow.avgRating * 10) / 10 : null
      const customerFlowUniqueRaters = flowRow != null ? flowRow.uniqueRaters : null

      return {
        businessId: biz.id,
        businessName: biz.business_name,
        tier: biz.tier,
        hasGoogleConnected: !!(biz.google_place_id || biz.google_oauth_refresh_token),
        // Funnel
        requestsSent: sent,
        requestsCompleted: completed,
        conversionRate,
        // Customer-facing page (same window): star taps + private feedback
        ratingTapsTotal,
        ratingTapsFiveStar,
        ratingTapsLowStar,
        privateFeedbackCount,
        // Tracked completions (email flow with token → /api/track/complete)
        platformClicksTotal,
        platformGoogle,
        platformFacebook,
        platformYelp,
        platformNextdoor,
        /** % of period rating taps that were 5★ (public page); null if none */
        fiveStarSharePct,
        /** PostHog: avg of first customer_responded rating per person in window (1–5) */
        customerFlowAvgRating,
        /** PostHog: distinct persons counted in customerFlowAvgRating */
        customerFlowUniqueRaters,
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
      totalRatingTaps: analytics.reduce((s, a) => s + a.ratingTapsTotal, 0),
      totalFiveStarTaps: analytics.reduce((s, a) => s + a.ratingTapsFiveStar, 0),
      totalPrivateFeedback: analytics.reduce((s, a) => s + a.privateFeedbackCount, 0),
      totalTrackedPlatformClicks: analytics.reduce((s, a) => s + a.platformClicksTotal, 0),
    }

    return res.status(200).json({
      analytics,
      aggregates,
      dateRange: { days, startDate: startIso },
      generatedAt: new Date().toISOString(),
      /** When set, Conversions column uses PostHog uniq(person) on platform_selected; else DB review_requests */
      conversionsSource: usePosthog ? 'posthog' : 'database',
      /** When set, Flow ★ uses PostHog customer_responded (one rating per person per window) */
      flowRatingSource: usePosthogFlowRatings ? 'posthog' : null,
    })
  } catch (err) {
    console.error('[admin/all-analytics] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
