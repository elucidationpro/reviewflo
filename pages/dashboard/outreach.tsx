/**
 * /dashboard/outreach
 * Review request sending + funnel stats + sent history.
 * Consolidates: the inline ReviewRequestsList that used to live on Overview
 * and the Review Funnel tab that used to live on /dashboard/analytics.
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import AppLayout from '../../components/AppLayout'
import ReviewRequestsList from '../../components/ReviewRequestsList'
import SendRequestModal from '../../components/SendRequestModal'
import { canSendFromDashboard } from '../../lib/tier-permissions'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
  tier: 'free' | 'pro' | 'ai'
}

interface FunnelData {
  sent: number
  opened: number
  clicked: number
  completed: number
  openRate: number
  clickRate: number
  completionRate: number
  platformBreakdown: Record<string, number>
}

interface PosthogConversions {
  conversionRate: number
  platformBreakdown: { google: number; facebook: number; yelp: number; nextdoor: number }
  source: 'posthog' | 'database'
}

type DateRange = 7 | 30 | 90

function InfoDot({ text }: { text: string }) {
  return (
    <span className="group/tip relative inline-flex items-center ml-1 cursor-help">
      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      <span className="invisible group-hover/tip:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg z-10 pointer-events-none">
        {text}
      </span>
    </span>
  )
}

export default function OutreachPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0)
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [posthog, setPosthog] = useState<PosthogConversions | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>(30)
  const [showSendModal, setShowSendModal] = useState(false)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const primaryColor = business?.primary_color || '#4A3428'

  const fetchData = useCallback(async (biz: Business, days: DateRange) => {
    if (!canSendFromDashboard(biz.tier)) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await fetch(`/api/analytics/dashboard-data?days=${days}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setFunnel(json.funnel ?? null)
      setPosthog(json.posthogConversions ?? null)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const [bizRes, feedbackRes] = await Promise.all([
        fetch('/api/my-business', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
      ])
      if (!bizRes.ok) { router.replace('/login'); return }
      const bizJson = await bizRes.json()
      const biz = bizJson.business as Business
      setBusiness(biz)
      setPendingFeedbackCount(feedbackRes.count ?? 0)

      await fetchData(biz, dateRange)
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!business) return
    fetchData(business, dateRange)
  }, [dateRange, business, fetchData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4A3428]" />
      </div>
    )
  }

  if (!business) return null

  const canSend = canSendFromDashboard(business.tier)

  return (
    <AppLayout
      businessName={business.business_name}
      tier={business.tier}
      pendingFeedbackCount={pendingFeedbackCount}
      onLogout={handleLogout}
    >
      <Head>
        <title>Outreach — ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="px-6 py-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Outreach</h1>
            <p className="text-sm text-gray-500 mt-0.5">Send review requests to customers and track their progress.</p>
          </div>
          {canSend && (
            <button
              type="button"
              onClick={() => setShowSendModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.25} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Send Request
            </button>
          )}
        </div>

        {/* Free-tier upgrade prompt */}
        {!canSend && (
          <div className="rounded-2xl border border-[#C9A961]/30 overflow-hidden shadow-sm mb-6">
            <div className="h-0.5 bg-gradient-to-r from-[#C9A961] via-[#e6c97a] to-[#C9A961]" />
            <div className="p-6 bg-gradient-to-br from-[#F5F5DC]/30 via-white to-white">
              <p className="text-xs font-semibold text-[#C9A961] uppercase tracking-widest mb-1">Pro feature</p>
              <h2 className="text-base font-bold text-gray-900 mb-2">Send from your dashboard</h2>
              <p className="text-sm text-gray-600 mb-4 max-w-lg">
                Outreach is available on Pro and AI tiers. Send requests by name, track opens and clicks, and view the full funnel — all without copy-pasting your review link.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/#pricing"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#4A3428] text-white hover:bg-[#4A3428]/90 transition-colors cursor-pointer"
                >
                  See Pricing
                </Link>
                <Link
                  href="/dashboard"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  ← Back to Overview
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Funnel (Pro/AI) */}
        {canSend && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Funnel</h2>
              <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                {([7, 30, 90] as DateRange[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDateRange(d)}
                    className={`px-2.5 py-1.5 transition-colors cursor-pointer ${
                      dateRange === d ? 'text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    style={dateRange === d ? { backgroundColor: primaryColor } : undefined}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {funnel && funnel.sent > 0 ? (
              <>
                {/* KPI chips */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
                  {[
                    { label: 'Sent', value: funnel.sent, sub: null, tip: null },
                    { label: 'Opened', value: funnel.opened, sub: `${funnel.openRate}%`, tip: 'Percentage of review requests that were opened by the recipient.' },
                    { label: 'Clicked', value: funnel.clicked, sub: funnel.opened > 0 ? `${funnel.clickRate}% of opened` : null, tip: 'Percentage of openers who tapped through to a review platform.' },
                    { label: 'Completed', value: funnel.completed, sub: `${funnel.completionRate}% of sent`, tip: 'Percentage of sent requests where the customer completed the flow.' },
                    { label: 'Conversion', value: posthog ? `${posthog.conversionRate}%` : '—', sub: null, tip: 'Unique customers who clicked a review platform. Tracked by PostHog.' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white rounded-xl border border-[#4A3428]/6 shadow-sm p-3 text-center"
                      style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
                    >
                      <div className="text-xl font-bold text-gray-900">{item.value}</div>
                      <div className="text-[11px] font-medium text-gray-500 mt-0.5 flex items-center justify-center">
                        {item.label}
                        {item.tip && <InfoDot text={item.tip} />}
                      </div>
                      {item.sub && <div className="text-[11px] text-gray-400 mt-0.5">{item.sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Conversion bars */}
                <div className="bg-white rounded-2xl border border-[#4A3428]/6 p-5"
                  style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
                >
                  <div className="space-y-2.5">
                    {[
                      { label: 'Sent', value: funnel.sent, pct: 100 },
                      { label: 'Opened', value: funnel.opened, pct: funnel.openRate },
                      { label: 'Clicked', value: funnel.clicked, pct: funnel.sent > 0 ? Math.round((funnel.clicked / funnel.sent) * 100) : 0 },
                      { label: 'Completed', value: funnel.completed, pct: funnel.completionRate },
                    ].map((step, i) => (
                      <div key={step.label} className="flex items-center gap-3">
                        <div className="w-24 shrink-0 text-xs text-gray-600">{step.label}</div>
                        <div className="flex-1 h-2.5 bg-[#F5F5DC]/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${step.pct}%`, backgroundColor: primaryColor, opacity: 1 - i * 0.15 }}
                          />
                        </div>
                        <div className="w-16 shrink-0 text-right">
                          <span className="text-xs font-semibold text-gray-700">{step.value}</span>
                          <span className="text-[11px] text-gray-400 ml-1">({step.pct}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-[#4A3428]/6 p-8 text-center"
                style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
              >
                <p className="text-sm text-gray-500">No review requests sent in the last {dateRange} days.</p>
                <button
                  type="button"
                  onClick={() => setShowSendModal(true)}
                  className="mt-3 inline-block text-sm font-semibold text-[#4A3428] hover:underline cursor-pointer"
                >
                  Send your first request →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Request history list */}
        {canSend && (
          <ReviewRequestsList
            businessId={business.id}
            businessSlug={business.slug}
            tier={business.tier}
            onSendRequest={() => setShowSendModal(true)}
            refetchTrigger={refetchTrigger}
          />
        )}
      </div>

      <SendRequestModal
        open={showSendModal}
        businessName={business.business_name}
        onClose={() => setShowSendModal(false)}
        onSuccess={() => {
          setShowSendModal(false)
          setRefetchTrigger((t) => t + 1)
          if (business) fetchData(business, dateRange)
        }}
      />
    </AppLayout>
  )
}
