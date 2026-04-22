import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../lib/supabase'
import { trackEvent, identifyUser } from '../lib/posthog-provider'
import OnboardingProgress from '../components/OnboardingProgress'
import ComingSoonTierModal, { type ComingSoonTier } from '@/components/ComingSoonTierModal'
import SendRequestModal from '@/components/SendRequestModal'
import ReviewRequestsList from '@/components/ReviewRequestsList'
import GoogleStatsCard from '@/components/GoogleStatsCard'
import AppLayout from '@/components/AppLayout'
import { canSendFromDashboard, canAccessGoogleStats } from '../lib/tier-permissions'
import { consumeGoogleAdsSignupConversionFromQuery } from '@/lib/google-ads'

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
}

interface ReviewStats {
  total: number
  breakdown: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

// ── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className = '', accent = false }: { children: React.ReactNode; className?: string; accent?: boolean }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-[#4A3428]/6 overflow-hidden transition-shadow duration-200 hover:shadow-md ${className}`}
      style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
    >
      {accent && <div className="h-0.5 bg-gradient-to-r from-[#C9A961] via-[#e6c97a] to-[#C9A961]" />}
      <div className="p-6">{children}</div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    total: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  })
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showComingSoonModal, setShowComingSoonModal] = useState(false)
  const [comingSoonTier, setComingSoonTier] = useState<ComingSoonTier | null>(null)
  const [launchMessage, setLaunchMessage] = useState<string | null>(null)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [updatingLaunchPref, setUpdatingLaunchPref] = useState(false)
  const [hasTrackedUpgradeCardView, setHasTrackedUpgradeCardView] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [refetchRequestsTrigger, setRefetchRequestsTrigger] = useState(0)
  const [conversionRate, setConversionRate] = useState<number | null>(null)
  const [funnelSent, setFunnelSent] = useState<number>(0)

  useEffect(() => {
    checkAuthAndFetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      const res = await fetch('/api/my-business', {
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

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [reviewsResult, feedbackCountResult] = await Promise.all([
        supabase
          .from('reviews')
          .select('star_rating')
          .eq('business_id', businessData.id)
          .gte('created_at', startOfMonth.toISOString()),
        supabase
          .from('feedback')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessData.id)
          .eq('is_resolved', false)
      ])

      if (!reviewsResult.error && reviewsResult.data) {
        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        reviewsResult.data.forEach((review) => {
          const rating = review.star_rating as 1 | 2 | 3 | 4 | 5
          if (rating >= 1 && rating <= 5) breakdown[rating]++
        })
        setReviewStats({ total: reviewsResult.data.length, breakdown })
      }

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
        const res = await fetch('/api/analytics/dashboard-data?days=30', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return
        const json = await res.json()
        setConversionRate(json.posthogConversions?.conversionRate ?? null)
        setFunnelSent(json.funnel?.sent ?? 0)
      } catch {
        // silent — conversion rate stays null (shown as —)
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

  const avgRating = reviewStats.total > 0
    ? (
        (reviewStats.breakdown[5] * 5 + reviewStats.breakdown[4] * 4 +
          reviewStats.breakdown[3] * 3 + reviewStats.breakdown[2] * 2 +
          reviewStats.breakdown[1] * 1) / reviewStats.total
      ).toFixed(1)
    : '—'

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

      <div className="px-6 py-8 max-w-2xl mx-auto space-y-4">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Reviews this month */}
          <Card>
            <p className="text-xs font-semibold text-[#4A3428]/50 uppercase tracking-widest mb-3">This Month</p>
            <div className="flex items-baseline gap-2 mb-1 animate-fade-in-up">
              <div
                className="text-5xl font-bold leading-none"
                style={{ color: business.primary_color || '#4A3428' }}
              >
                {reviewStats.total}
              </div>
              <span className="text-sm text-gray-400 font-medium">reviews</span>
            </div>

            <div className="mt-4 space-y-2">
              {[5, 4, 3, 2, 1].map((rating, i) => (
                <div key={rating} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-3 text-right tabular-nums">{rating}</span>
                  <svg className="w-3 h-3 shrink-0 opacity-70" fill={business.primary_color || '#4A3428'} viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <div className="flex-1 bg-[#F5F5DC]/80 rounded-full h-2 overflow-hidden">
                    <div
                      className="bar-animate h-full rounded-full"
                      style={{
                        width: reviewStats.total > 0
                          ? `${(reviewStats.breakdown[rating as keyof typeof reviewStats.breakdown] / reviewStats.total) * 100}%`
                          : '0%',
                        backgroundColor: business.primary_color || '#4A3428',
                        opacity: 0.85,
                        animationDelay: `${i * 80}ms`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-4 text-right tabular-nums">
                    {reviewStats.breakdown[rating as keyof typeof reviewStats.breakdown]}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card>
            <p className="text-xs font-semibold text-[#4A3428]/50 uppercase tracking-widest mb-3">Quick Stats</p>
            <div className="space-y-2.5">
              <div className="p-3 bg-[#F5F5DC]/40 border border-[#C9A961]/20 rounded-xl animate-fade-in-up" style={{ animationDelay: '60ms' }}>
                <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                  Avg Rating
                </p>
                <p className="text-2xl font-bold text-[#4A3428]">{avgRating}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">Pending Feedback</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-gray-900">{pendingFeedbackCount}</p>
                  {pendingFeedbackCount > 0 && (
                    <Link href="/feedback" className="text-xs text-[#4A3428] font-semibold hover:underline">View →</Link>
                  )}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-0.5">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {conversionRate !== null && funnelSent > 0 ? `${conversionRate}%` : '—'}
                </p>
                <p className="text-xs text-gray-400">clicked a review platform</p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Google Stats (Pro/AI) ── */}
        {canAccessGoogleStats(business.tier) && (
          <GoogleStatsCard primaryColor={business.primary_color || '#4A3428'} />
        )}

        {/* ── Review Requests (Pro/AI) ── */}
        {canSendFromDashboard(business.tier) && (
          <ReviewRequestsList
            businessId={business.id}
            businessSlug={business.slug}
            tier={business.tier}
            onSendRequest={() => setShowSendModal(true)}
            refetchTrigger={refetchRequestsTrigger}
          />
        )}

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

          {reviewStats.total === 0 && (
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

        {/* ── Footer ── */}
        <a
          href="https://usereviewflo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-6 text-gray-400 text-xs hover:text-gray-500 transition-colors"
        >
          <span>Powered by</span>
          <div className="relative w-20 h-5">
            <Image src="/images/reviewflo-logo.svg" alt="ReviewFlo" fill className="object-contain" />
          </div>
        </a>

      </div>

      {showComingSoonModal && comingSoonTier && (
        <ComingSoonTierModal
          open={showComingSoonModal}
          tier={comingSoonTier}
          onClose={() => { setShowComingSoonModal(false); setComingSoonTier(null) }}
          onContinueWithFree={handleComingSoonContinue}
        />
      )}
      <SendRequestModal
        open={showSendModal}
        businessName={business.business_name}
        onClose={() => setShowSendModal(false)}
        onSuccess={() => {
          setShowSendModal(false)
          setRefetchRequestsTrigger((t) => t + 1)
        }}
      />
    </AppLayout>
  )
}
