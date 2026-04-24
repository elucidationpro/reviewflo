import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { trackEvent, identifyUser } from '../lib/posthog-provider'
import OnboardingProgress from '../components/OnboardingProgress'
import ComingSoonTierModal, { type ComingSoonTier } from '@/components/ComingSoonTierModal'
import RecentActivity from '@/components/RecentActivity'
import AppLayout from '@/components/AppLayout'
import { canSendFromDashboard, canAccessGoogleStats } from '../lib/tier-permissions'
import { consumeGoogleAdsSignupConversionFromQuery } from '@/lib/google-ads'
import { useBusiness } from '@/contexts/BusinessContext'
import type { GbpFullReview } from './api/google-reviews/list'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
  google_review_url?: string | null
  facebook_review_url?: string | null
  skip_template_choice?: boolean
  tier: 'free' | 'pro' | 'ai'
  interested_in_tier?: 'pro' | 'ai' | null
  notify_on_launch?: boolean
  launch_discount_eligible?: boolean
  google_connected?: boolean
}

interface CachedGbpStats {
  total_reviews: number | null
  average_rating: number | null
  reviews_this_month: number | null
}

// ── Card wrapper ─────────────────────────────────────────────────────────────
function Card({
  children,
  className = '',
  accent = false,
  compact = false,
}: {
  children: React.ReactNode
  className?: string
  accent?: boolean
  compact?: boolean
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#4A3428]/6 overflow-hidden transition-shadow duration-200 hover:shadow-md ${className}`}
      style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
    >
      {accent && <div className="h-0.5 bg-gradient-to-r from-[#C9A961] via-[#e6c97a] to-[#C9A961]" />}
      <div className={compact ? 'p-4' : 'p-6'}>{children}</div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { selectedBusinessId } = useBusiness()
  const [isLoading, setIsLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showComingSoonModal, setShowComingSoonModal] = useState(false)
  const [comingSoonTier, setComingSoonTier] = useState<ComingSoonTier | null>(null)
  const [launchMessage, setLaunchMessage] = useState<string | null>(null)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [updatingLaunchPref, setUpdatingLaunchPref] = useState(false)
  const [hasTrackedUpgradeCardView, setHasTrackedUpgradeCardView] = useState(false)
  const [cachedGbpStats, setCachedGbpStats] = useState<CachedGbpStats | null>(null)
  const [requestsSentThisMonth, setRequestsSentThisMonth] = useState<number | null>(null)
  const [gbpReviews, setGbpReviews] = useState<GbpFullReview[]>([])
  const [gbpReviewsLoading, setGbpReviewsLoading] = useState(false)
  const [reviewsData, setReviewsData] = useState<{ replyRate: number | null; unrepliedCount: number } | null>(null)

  useEffect(() => {
    checkAuthAndFetchData()
    // Re-fetch when the selected location changes so KPIs/feedback counts scope correctly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  useEffect(() => {
    if (!router.isReady) return
    const { hadNewSignupParam } = consumeGoogleAdsSignupConversionFromQuery(router.query)
    if (hadNewSignupParam) {
      router.replace('/dashboard', undefined, { shallow: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.new_signup])

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }
      const user = session.user

      console.time('[Dashboard] Business Fetch')
      const url = selectedBusinessId
        ? `/api/my-business?businessId=${encodeURIComponent(selectedBusinessId)}`
        : '/api/my-business'
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      console.timeEnd('[Dashboard] Business Fetch')

      if (res.status === 401) {
        router.push('/login')
        return
      }

      const data = await res.json().catch(() => ({} as Record<string, unknown>))

      if (!res.ok || !data.business) {
        console.log('[Dashboard] No business found:', {
          status: res.status,
          ok: res.ok,
          hasBusiness: !!(data as Record<string, unknown>).business,
          userEmail: user.email,
          userId: user.id,
          data
        })
        setIsLoading(false)
        return
      }
      const businessData = data.business as Business

      setBusiness(businessData)

      identifyUser(user.id, {
        businessId: businessData.id,
        businessName: businessData.business_name,
        businessSlug: businessData.slug,
      })

      trackEvent('business_onboarded', {
        businessId: businessData.id,
        businessName: businessData.business_name,
        onboardingDate: new Date().toISOString(),
      })

      const feedbackCountResult = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessData.id)
        .eq('is_resolved', false)

      if (!feedbackCountResult.error) {
        setPendingFeedbackCount(feedbackCountResult.count ?? 0)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('[Dashboard] Error:', error)
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const baseHost = 'usereviewflo.com'
  const fullUrlForCopy = `https://${baseHost}/${business?.slug || ''}`
  const displayLink = `${baseHost}/${business?.slug || ''}`

  const handleCopyReviewLink = async () => {
    if (!fullUrlForCopy || fullUrlForCopy.endsWith('/')) return
    try {
      await navigator.clipboard.writeText(fullUrlForCopy)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch {
      const input = document.createElement('input')
      input.value = fullUrlForCopy
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    }
  }

  const handleTrackUpgradeCardViewed = useCallback(() => {
    if (!business || hasTrackedUpgradeCardView) return
    if (business.tier !== 'free' || business.interested_in_tier) return
    trackEvent('upgrade_card_viewed', { businessId: business.id, tier: business.tier, source: 'dashboard' })
    setHasTrackedUpgradeCardView(true)
  }, [business, hasTrackedUpgradeCardView])

  useEffect(() => {
    handleTrackUpgradeCardViewed()
  }, [handleTrackUpgradeCardViewed])

  useEffect(() => {
    if (!business) return
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const statsUrl = `/api/google-stats/fetch?businessId=${encodeURIComponent(business.id)}`
        const [statsRes, reqCountResult] = await Promise.all([
          fetch(statsUrl, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          supabase
            .from('review_requests')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', business.id)
            .gte('sent_at', startOfMonth.toISOString()),
        ])

        if (statsRes.ok) {
          const j = await statsRes.json()
          const s = j.stats
          if (s) {
            setCachedGbpStats({
              total_reviews: s.total_reviews ?? null,
              average_rating: s.average_rating ?? null,
              reviews_this_month: s.reviews_this_month ?? null,
            })
          } else {
            setCachedGbpStats(null)
          }
        }

        if (!reqCountResult.error) {
          setRequestsSentThisMonth(reqCountResult.count ?? 0)
        }

        if (!canAccessGoogleStats(business.tier) || !business.google_connected) {
          setGbpReviews([])
          setReviewsData(null)
          return
        }

        setGbpReviewsLoading(true)
        const listRes = await fetch(`/api/google-reviews/list?businessId=${encodeURIComponent(business.id)}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        setGbpReviewsLoading(false)
        if (!listRes.ok) {
          setGbpReviews([])
          setReviewsData(null)
          return
        }
        const json = await listRes.json()
        const reviews: GbpFullReview[] = json.reviews ?? []
        setGbpReviews(reviews)
        const unrepliedCount = reviews.filter((r) => !r.reviewReply).length
        const replyRate =
          reviews.length > 0 ? Math.round((1 - unrepliedCount / reviews.length) * 100) : null
        setReviewsData({ replyRate, unrepliedCount })
      } catch {
        setGbpReviewsLoading(false)
      }
    })()
  }, [business])

  const handlePricingClick = () => {
    if (business) trackEvent('pricing_viewed_from_dashboard', { businessId: business.id, source: 'dashboard' })
    router.push('/#pricing')
  }

  const updateLaunchPreference = useCallback(
    async (tier: ComingSoonTier | null, notifyOnLaunch: boolean) => {
      if (!business || !tier) return
      setUpdatingLaunchPref(true)
      setLaunchError(null)
      setLaunchMessage(null)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setLaunchError('Session expired. Please log in again.')
          setUpdatingLaunchPref(false)
          return
        }

        const res = await fetch('/api/update-launch-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ businessId: business.id, interestedInTier: tier, notifyOnLaunch }),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setLaunchError((data as Record<string, string>)?.error || 'Failed to update. Please try again.')
          setUpdatingLaunchPref(false)
          return
        }

        const updatedTier = ((data as Record<string, unknown>)?.interested_in_tier ?? tier) as 'pro' | 'ai'
        const updatedNotify = (data as Record<string, unknown>)?.notify_on_launch ?? notifyOnLaunch

        setBusiness({ ...business, interested_in_tier: updatedTier, notify_on_launch: updatedNotify as boolean })

        const tierLabel = updatedTier === 'pro' ? 'Pro' : 'AI'
        setLaunchMessage(
          updatedNotify
            ? `We'll email you when ${tierLabel} launches in May 2026.`
            : `Your preference for the ${tierLabel} tier has been updated.`
        )

        trackEvent('upgrade_notification_requested', {
          businessId: business.id,
          tier: updatedTier,
          notifyOnLaunch: updatedNotify,
          source: 'dashboard',
        })
      } catch (error) {
        console.error('Error updating launch preference from dashboard:', error)
        setLaunchError('Something went wrong. Please try again.')
      } finally {
        setUpdatingLaunchPref(false)
      }
    },
    [business]
  )

  const handleComingSoonContinue = useCallback(
    async (notifyOnLaunch: boolean) => {
      if (!comingSoonTier) return
      await updateLaunchPreference(comingSoonTier, notifyOnLaunch)
      setShowComingSoonModal(false)
      setComingSoonTier(null)
    },
    [comingSoonTier, updateLaunchPreference]
  )

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4A3428]" />
      </div>
    )
  }

  // ── No business ────────────────────────────────────────────────────────────
  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F5DC]/30 via-white to-[#F5F5DC]/30 px-4">
        <Card className="max-w-sm text-center">
          <h1 className="text-lg font-bold text-gray-900 mb-2">No Business Found</h1>
          <p className="text-sm text-gray-500 mb-5">Your account isn&apos;t linked to a business yet.</p>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-[#4A3428] text-white text-sm font-semibold rounded-lg hover:bg-[#4A3428]/90 transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </Card>
      </div>
    )
  }

  const hasCustomColor = business.primary_color && business.primary_color !== '#3B82F6'

  const ratingKpi =
    cachedGbpStats?.average_rating != null ? `${Number(cachedGbpStats.average_rating).toFixed(1)} ★` : '—'
  const totalReviewsKpi =
    cachedGbpStats?.total_reviews != null ? String(cachedGbpStats.total_reviews) : '—'
  const newMonthKpi =
    cachedGbpStats?.reviews_this_month != null
      ? `+${cachedGbpStats.reviews_this_month}`
      : '—'
  const replyKpi =
    reviewsData?.replyRate != null ? `${reviewsData.replyRate}% replied` : '—'
  const requestsKpi = requestsSentThisMonth != null ? `${requestsSentThisMonth} sent` : '—'

  const showGoogleReviewsColumn = canAccessGoogleStats(business.tier) && !!business.google_connected

  const alertItems: { key: string; node: ReactNode }[] = []
  if (reviewsData && reviewsData.unrepliedCount > 0) {
    alertItems.push({
      key: 'unreplied',
      node: (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800 font-medium">
            {reviewsData.unrepliedCount}{' '}
            {reviewsData.unrepliedCount === 1 ? 'review' : 'reviews'} awaiting your reply
          </p>
          <Link
            href="/dashboard/reviews?filter=unreplied"
            className="text-xs font-semibold text-amber-900 hover:underline shrink-0"
          >
            Reply now →
          </Link>
        </div>
      ),
    })
  }
  if (canAccessGoogleStats(business.tier) && !business.google_connected) {
    alertItems.push({
      key: 'gbp',
      node: (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl">
          <p className="text-sm text-sky-900 font-medium">Connect Google Business Profile to load reviews and reply from ReviewFlo.</p>
          <Link href="/settings" className="text-xs font-semibold text-sky-900 hover:underline shrink-0">
            Settings →
          </Link>
        </div>
      ),
    })
  }
  if (pendingFeedbackCount > 0) {
    alertItems.push({
      key: 'feedback',
      node: (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
          <p className="text-sm text-violet-900 font-medium">
            {pendingFeedbackCount} private feedback{' '}
            {pendingFeedbackCount === 1 ? 'item' : 'items'} to review
          </p>
          <Link href="/feedback" className="text-xs font-semibold text-violet-900 hover:underline shrink-0">
            Open →
          </Link>
        </div>
      ),
    })
  }

  return (
    <AppLayout
      businessName={business.business_name}
      tier={business.tier}
      pendingFeedbackCount={pendingFeedbackCount}
      onLogout={handleLogout}
    >
      <Head>
        <title>Dashboard — ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <OnboardingProgress
        businessId={business.id}
        tier={business.tier}
        hasGoogleLink={!!(business.google_review_url && business.google_review_url.trim())}
        hasFacebookLink={!!(business.facebook_review_url && business.facebook_review_url.trim())}
        hasCustomColor={!!hasCustomColor}
        hasEditedTemplates={!business.skip_template_choice}
      />

      <div className="px-6 py-8 max-w-6xl mx-auto space-y-5">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card compact>
            <p className="text-[10px] font-semibold text-[#4A3428]/50 uppercase tracking-widest mb-2">Google rating</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{ratingKpi}</p>
          </Card>
          <Card compact>
            <p className="text-[10px] font-semibold text-[#4A3428]/50 uppercase tracking-widest mb-2">Google reviews</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{totalReviewsKpi}</p>
          </Card>
          <Card compact>
            <p className="text-[10px] font-semibold text-[#4A3428]/50 uppercase tracking-widest mb-2">New this month</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{newMonthKpi}</p>
            <p className="text-[11px] text-gray-400 mt-1">Google</p>
          </Card>
          <Card compact>
            <p className="text-[10px] font-semibold text-[#4A3428]/50 uppercase tracking-widest mb-2">Reply rate</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 tabular-nums leading-tight">{replyKpi}</p>
          </Card>
          <Card compact className="sm:col-span-2 lg:col-span-1">
            <p className="text-[10px] font-semibold text-[#4A3428]/50 uppercase tracking-widest mb-2">Requests (month)</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{requestsKpi}</p>
            <p className="text-[11px] text-gray-400 mt-1">Review requests sent</p>
          </Card>
        </div>

        {/* ── Alert strip ── */}
        {alertItems.length > 0 && (
          <div className="space-y-2">
            {alertItems.map((a) => (
              <div key={a.key}>{a.node}</div>
            ))}
          </div>
        )}

        <RecentActivity
          reviews={gbpReviews}
          reviewsLoading={gbpReviewsLoading}
          showGoogleReviews={showGoogleReviewsColumn}
        />

        {/* ── Your Review Link ── */}
        <Card accent>
          <h2 className="text-base font-bold text-gray-900 mb-1">Your Review Link</h2>
          <p className="text-xs text-gray-500 mb-4">
            Send this to customers after each job — they rate their experience, then get guided to Google.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center bg-[#F5F5DC]/40 rounded-xl px-3.5 py-2.5 border border-[#C9A961]/30 min-w-0">
              <a
                href={fullUrlForCopy}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-[#4A3428] truncate hover:underline"
              >
                {displayLink}
              </a>
            </div>
            <button
              onClick={handleCopyReviewLink}
              className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.97] cursor-pointer"
              style={{ backgroundColor: business.primary_color || '#4A3428' }}
            >
              {linkCopied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
          </div>

          {(cachedGbpStats?.total_reviews == null || cachedGbpStats.total_reviews === 0) && (
            <p className="text-xs text-gray-400 mt-3">
              Tip: send the link to yourself first to see how the flow works.
            </p>
          )}
        </Card>

        {/* ── Send from Dashboard promo (free) ── */}
        {!canSendFromDashboard(business.tier) && (
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">Send Review Requests from Here</p>
                <p className="text-xs text-gray-500">
                  Pro unlocks dashboard sending — no copy-paste required.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setComingSoonTier('pro'); setShowComingSoonModal(true) }}
                  disabled={updatingLaunchPref}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#4A3428] text-white hover:bg-[#4A3428]/90 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  Get Notified
                </button>
                <button
                  type="button"
                  onClick={handlePricingClick}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  See Pricing
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Upgrade card (free, not yet on list) ── */}
        {business.tier === 'free' && !business.interested_in_tier && (
          <div className="rounded-2xl border border-[#C9A961]/30 overflow-hidden shadow-sm">
            <div className="h-0.5 bg-gradient-to-r from-[#C9A961] via-[#e6c97a] to-[#C9A961]" />
            <div className="p-6 bg-gradient-to-br from-[#F5F5DC]/30 via-white to-white">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[#C9A961] uppercase tracking-widest mb-1">Coming May 2026</p>
                  <h2 className="text-base font-bold text-gray-900 mb-2">Pro &amp; AI Tiers</h2>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <p><span className="font-semibold text-gray-800">Pro ($19/mo)</span> — dashboard sending, auto follow-ups, multi-platform</p>
                    <p><span className="font-semibold text-gray-800">AI ($49/mo)</span> — SMS automation, AI features, CRM integration</p>
                    <p className="text-emerald-700 font-medium">Early signup: 50% off first 3 months</p>
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 sm:w-40">
                  <button
                    type="button"
                    onClick={() => { setComingSoonTier('pro'); setShowComingSoonModal(true) }}
                    disabled={updatingLaunchPref}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#4A3428] text-white hover:bg-[#4A3428]/90 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    Notify me — Pro
                  </button>
                  <button
                    type="button"
                    onClick={() => { setComingSoonTier('ai'); setShowComingSoonModal(true) }}
                    disabled={updatingLaunchPref}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-[#C9A961] text-[#4A3428] bg-[#F5F5DC]/60 hover:bg-[#F5F5DC] transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    Notify me — AI
                  </button>
                  <button
                    type="button"
                    onClick={handlePricingClick}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    See Pricing
                  </button>
                </div>
              </div>
              {launchMessage && <p className="mt-3 text-xs text-emerald-700 font-medium">{launchMessage}</p>}
              {launchError && <p className="mt-3 text-xs text-red-600 font-medium">{launchError}</p>}
            </div>
          </div>
        )}

        {/* ── Already on launch list ── */}
        {business.tier === 'free' && business.interested_in_tier && (
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    You&apos;re on the {business.interested_in_tier === 'pro' ? 'Pro' : 'AI'} launch list
                  </p>
                </div>
                <p className="text-xs text-gray-500 ml-7">
                  We&apos;ll email you in May 2026. Your discount: <span className="text-emerald-700 font-semibold">50% off first 3 months</span>.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => router.push('/settings')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handlePricingClick}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#4A3428] text-white hover:bg-[#4A3428]/90 transition-colors cursor-pointer"
                >
                  See Plans
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* ── Footer (visual only in app; no external navigation) ── */}
        <div
          role="presentation"
          className="flex items-center justify-center gap-2 py-6 text-gray-400 text-xs hover:text-gray-500 transition-colors cursor-pointer select-none"
          aria-label="Powered by ReviewFlo (display only)"
        >
          <span>Powered by</span>
          <div className="relative w-20 h-5">
            <Image src="/images/reviewflo-logo.svg" alt="ReviewFlo" fill className="object-contain" />
          </div>
        </div>

      </div>

      {showComingSoonModal && comingSoonTier && (
        <ComingSoonTierModal
          open={showComingSoonModal}
          tier={comingSoonTier}
          onClose={() => { setShowComingSoonModal(false); setComingSoonTier(null) }}
          onContinueWithFree={handleComingSoonContinue}
        />
      )}
    </AppLayout>
  )
}
