/**
 * Cron: Fetch Google Business Stats
 * Schedule: 0 0 * * * (daily at midnight)
 *
 * Fetches current Google stats for all Pro/AI businesses with a google_place_id
 * or OAuth token, stores a daily snapshot, and calculates week/month deltas.
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import {
  fetchStatsWithOAuth,
  fetchPlaceStats,
  calculateDeltas,
  sleep,
} from '../../../lib/google-places-service'
import { trackEvent } from '../../../lib/posthog-provider'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const CRON_SECRET = process.env.CRON_SECRET
const RATE_LIMIT_MS = 200 // 200ms between API calls to avoid quota issues

interface Business {
  id: string
  business_name: string
  tier: string
  google_place_id: string | null
  google_oauth_refresh_token: string | null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify cron secret
  const authHeader = req.headers.authorization
  if (CRON_SECRET && (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`)) {
    console.warn('[fetch-google-stats] Unauthorized cron attempt')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const startTime = Date.now()
  console.log('[fetch-google-stats] Cron started at', new Date().toISOString())

  try {
    // Get all Pro/AI businesses that have a way to fetch Google stats
    const { data: businesses, error: bizError } = await supabaseAdmin
      .from('businesses')
      .select('id, business_name, tier, google_place_id, google_oauth_refresh_token')
      .in('tier', ['pro', 'ai'])
      .or('google_place_id.not.is.null,google_oauth_refresh_token.not.is.null')

    if (bizError) {
      console.error('[fetch-google-stats] Failed to fetch businesses:', bizError)
      return res.status(500).json({ error: 'Failed to fetch businesses' })
    }

    const eligibleBusinesses: Business[] = businesses || []
    console.log(`[fetch-google-stats] Processing ${eligibleBusinesses.length} businesses`)

    const results = {
      total: eligibleBusinesses.length,
      success: 0,
      skipped: 0,
      errors: 0,
    }

    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    for (const business of eligibleBusinesses) {
      try {
        // --- Fetch current stats ---
        let stats = null

        if (business.google_oauth_refresh_token) {
          // Prefer OAuth (gets ALL reviews, not just 5)
          stats = await fetchStatsWithOAuth(
            business.google_oauth_refresh_token,
            business.google_place_id
          )
          // GBP_DEBUG
          console.log('[GBP_DEBUG] cron OAuth attempt result:', {
            business_id: business.id,
            business_name: business.business_name,
            place_id_fallback: business.google_place_id,
            stats_returned: stats !== null,
            total_reviews: stats?.totalReviews ?? null,
            source: stats?.source ?? null,
          });
        } else if (business.google_place_id) {
          // Fallback to Places API
          const placeStats = await fetchPlaceStats(business.google_place_id)
          if (placeStats) {
            stats = { ...placeStats, source: 'places_api' as const }
          }
        }

        if (!stats) {
          // GBP_DEBUG
          console.error('[GBP_DEBUG] cron: stats null after all fetch attempts:', {
            business_id: business.id,
            business_name: business.business_name,
            had_oauth_token: !!business.google_oauth_refresh_token,
            had_place_id: !!business.google_place_id,
          });
          console.warn(`[fetch-google-stats] No stats for business ${business.id} (${business.business_name})`)
          results.skipped++
          await sleep(RATE_LIMIT_MS)
          continue
        }

        // --- Get recent snapshots to calculate deltas ---
        const { data: recentSnapshots } = await supabaseAdmin
          .from('google_business_snapshots')
          .select('snapshot_date, total_reviews, average_rating')
          .eq('business_id', business.id)
          .order('snapshot_date', { ascending: false })
          .limit(35) // ~5 weeks of history

        const deltas = calculateDeltas(
          stats.totalReviews,
          stats.averageRating,
          recentSnapshots || []
        )

        // --- Upsert snapshot (one per business per day) ---
        const { error: upsertError } = await supabaseAdmin
          .from('google_business_snapshots')
          .upsert(
            {
              business_id: business.id,
              snapshot_date: today,
              total_reviews: stats.totalReviews,
              average_rating: stats.averageRating,
              reviews_this_week: deltas.reviewsThisWeek,
              reviews_this_month: deltas.reviewsThisMonth,
              rating_change_week: deltas.ratingChangeWeek,
              rating_change_month: deltas.ratingChangeMonth,
              fetch_source: stats.source,
            },
            { onConflict: 'business_id,snapshot_date' }
          )

        if (upsertError) {
          console.error(`[fetch-google-stats] Upsert failed for ${business.id}:`, upsertError)
          results.errors++
        } else {
          // Also update the existing google_business_stats (current state cache)
          await supabaseAdmin
            .from('google_business_stats')
            .upsert(
              {
                business_id: business.id,
                total_reviews: stats.totalReviews,
                average_rating: stats.averageRating,
                reviews_this_month: deltas.reviewsThisMonth,
                last_fetched: new Date().toISOString(),
              },
              { onConflict: 'business_id' }
            )

          console.log(
            `[fetch-google-stats] ✓ ${business.business_name}: ${stats.totalReviews} reviews, ${stats.averageRating}★ (${stats.source})`
          )
          results.success++
        }
      } catch (businessError) {
        console.error(`[fetch-google-stats] Error processing business ${business.id}:`, businessError)
        results.errors++
      }

      // Rate limiting between businesses
      await sleep(RATE_LIMIT_MS)
    }

    const duration = Date.now() - startTime
    console.log(`[fetch-google-stats] Done in ${duration}ms:`, results)

    // PostHog server-side tracking
    try {
      trackEvent('cron_fetch_google_stats_completed', {
        total: results.total,
        success: results.success,
        skipped: results.skipped,
        errors: results.errors,
        duration_ms: duration,
        date: today,
      })
    } catch {
      // Don't fail cron if PostHog errors
    }

    return res.status(200).json({
      date: today,
      ...results,
      success: true,
      duration_ms: duration,
    })
  } catch (err) {
    console.error('[fetch-google-stats] Fatal error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
