/**
 * /admin/analytics
 * Admin view: all users' performance at a glance.
 * Sortable table, filter by tier, export to CSV.
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'
import AdminLayout from '@/components/AdminLayout'
const AnalyticsTopBusinessesChart = dynamic(
  () => import('@/components/admin/AnalyticsTopBusinessesChart'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full sm:h-[320px] animate-pulse rounded-xl bg-stone-100" aria-hidden />
    ),
  }
)

/** Avoid hanging forever if the admin API or PostHog is slow */
const ANALYTICS_FETCH_MS = 90_000

type ChartMetric = 'conversions' | 'stars' | 'fiveStar'

interface BusinessAnalytics {
  businessId: string
  businessName: string
  tier: string
  hasGoogleConnected: boolean
  requestsSent: number
  requestsCompleted: number
  conversionRate: number
  ratingTapsTotal: number
  ratingTapsFiveStar: number
  ratingTapsLowStar: number
  privateFeedbackCount: number
  platformClicksTotal: number
  platformGoogle: number
  platformFacebook: number
  platformYelp: number
  platformNextdoor: number
  fiveStarSharePct: number | null
  customerFlowAvgRating: number | null
  customerFlowUniqueRaters: number | null
  currentRating: number | null
  totalReviews: number | null
  reviewsThisMonth: number | null
  ratingChangeMonth: number | null
  googleRevenue: number
  totalRevenue: number
  attributionPct: number
  monthlyCost: number
}

interface Aggregates {
  totalBusinesses: number
  byTier: { free: number; pro: number; ai: number }
  totalRequestsSent: number
  avgConversionRate: number
  totalGoogleRevenue: number
  businessesWithGoogleConnected: number
  totalRatingTaps: number
  totalFiveStarTaps: number
  totalPrivateFeedback: number
  totalTrackedPlatformClicks: number
}

type SortKey = keyof BusinessAnalytics
type SortDir = 'asc' | 'desc'

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    free: 'bg-stone-100 text-stone-600 ring-1 ring-stone-200/80',
    pro: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/80',
    ai: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/80',
  }
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${styles[tier] || 'bg-stone-100'}`}>
      {tier}
    </span>
  )
}

export default function AdminAnalytics() {
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router
  const [data, setData] = useState<BusinessAnalytics[]>([])
  const [aggregates, setAggregates] = useState<Aggregates | null>(null)
  const [conversionsSource, setConversionsSource] = useState<'posthog' | 'database'>('database')
  const [flowRatingSource, setFlowRatingSource] = useState<'posthog' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)
  const [tierFilter, setTierFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('requestsSent')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('conversions')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), ANALYTICS_FETCH_MS)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        routerRef.current.push('/login')
        return
      }

      const params = new URLSearchParams({ days: String(days) })
      if (tierFilter) params.set('tier', tierFilter)

      const res = await fetch(`/api/admin/all-analytics?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        signal: ac.signal,
      })
      if (res.status === 403) {
        routerRef.current.push('/dashboard')
        return
      }
      if (!res.ok) {
        setError('Failed to load analytics')
        return
      }
      const result = await res.json()
      setData(result.analytics || [])
      setAggregates(result.aggregates || null)
      setConversionsSource(result.conversionsSource === 'posthog' ? 'posthog' : 'database')
      setFlowRatingSource(result.flowRatingSource === 'posthog' ? 'posthog' : null)
    } catch (e: unknown) {
      const name = e instanceof Error ? e.name : ''
      if (name === 'AbortError') {
        setError('Analytics request timed out. Try again or check server/PostHog.')
      } else {
        setError('Failed to load analytics')
      }
    } finally {
      clearTimeout(t)
      setLoading(false)
    }
  }, [days, tierFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...data]
    .filter((b) => !search || b.businessName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      const aNum = aVal === null ? -Infinity : typeof aVal === 'boolean' ? (aVal ? 1 : 0) : Number(aVal)
      const bNum = bVal === null ? -Infinity : typeof bVal === 'boolean' ? (bVal ? 1 : 0) : Number(bVal)
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum
    })

  const chartRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const filtered = term
      ? data.filter((b) => b.businessName.toLowerCase().includes(term))
      : data
    const key: keyof BusinessAnalytics =
      chartMetric === 'conversions'
        ? 'platformClicksTotal'
        : chartMetric === 'fiveStar'
          ? 'ratingTapsFiveStar'
          : 'ratingTapsTotal'
    return [...filtered]
      .sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0))
      .slice(0, 10)
      .map((b) => {
        const v = Number(b[key] ?? 0)
        return {
          shortName:
            b.businessName.length > 28 ? `${b.businessName.slice(0, 26)}\u2026` : b.businessName,
          fullName: b.businessName,
          value: v,
        }
      })
  }, [data, search, chartMetric])

  const chartMeta = useMemo(() => {
    switch (chartMetric) {
      case 'conversions':
        return {
          title: 'Conversions',
          subtitle: conversionsSource === 'posthog' ? 'Unique people (PostHog)' : 'Tracked completions (DB)',
          fill: '#166534',
        }
      case 'fiveStar':
        return { title: '5\u2605 taps', subtitle: 'Public rating page (period)', fill: '#B45309' }
      default:
        return { title: 'Star taps', subtitle: 'All ratings on public page (period)', fill: '#4A3428' }
    }
  }, [chartMetric, conversionsSource])

  const exportCSV = () => {
    const headers = [
      'Business', 'Tier',
      'Star taps', '5\u2605 taps', '1\u20134\u2605 taps', 'Private FB',
      'Conversions', 'G', 'Fb', 'Yelp', 'ND', '5\u2605 share%',
      'Sent', 'Completed', 'Email conv%',
      'Flow \u2605 avg (PH)', 'Flow raters (PH)',
      'GBP list \u2605', 'Reviews', 'New/Mo', 'Rating \u0394',
      'Google Rev', 'Total Rev', 'Attr%',
    ]
    const rows = sorted.map((b) => [
      b.businessName, b.tier,
      b.ratingTapsTotal, b.ratingTapsFiveStar, b.ratingTapsLowStar, b.privateFeedbackCount,
      b.platformClicksTotal, b.platformGoogle, b.platformFacebook, b.platformYelp, b.platformNextdoor,
      b.fiveStarSharePct ?? '',
      b.requestsSent, b.requestsCompleted, b.conversionRate,
      b.customerFlowAvgRating ?? '', b.customerFlowUniqueRaters ?? '',
      b.currentRating ?? '', b.totalReviews ?? '',
      b.reviewsThisMonth ?? '', b.ratingChangeMonth ?? '',
      b.googleRevenue, b.totalRevenue, b.attributionPct,
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reviewflo-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="ml-1 text-stone-400/70 group-hover:text-stone-300 transition-colors" aria-hidden>
      {sortKey === col ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}
    </span>
  )

  const Th = ({ col, label, title: thTitle }: { col: SortKey; label: string; title?: string }) => (
    <th
      title={thTitle}
      scope="col"
      className="group px-3 py-3.5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wide cursor-pointer hover:text-white whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-800 rounded-sm transition-colors"
      onClick={() => handleSort(col)}
    >
      {label}<SortIcon col={col} />
    </th>
  )

  const darkControlClass =
    'rounded-xl border border-stone-600/80 bg-stone-800 text-stone-100 px-3 py-2.5 text-sm transition hover:border-stone-500 hover:bg-stone-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900'

  return (
    <>
      <Head><title>Admin Analytics — ReviewFlo</title></Head>
      <AdminLayout onLogout={handleLogout}>
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

          {/* ── Dark header band ─────────────────────────────────── */}
          <header className="relative rounded-2xl bg-stone-900 text-white overflow-hidden shadow-xl ring-1 ring-black/10">
            {/* Subtle radial glow accent */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,169,97,0.08)_0%,_transparent_60%)] pointer-events-none" aria-hidden />
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" aria-hidden />
                      Admin
                    </span>
                    <span className="text-stone-600 select-none">&middot;</span>
                    <span className="text-xs font-medium text-stone-400">All businesses</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Portfolio analytics</h1>
                  <p className="text-sm text-stone-400 max-w-2xl leading-relaxed">
                    Rollup across businesses for the selected window. Star taps and private feedback use the same period as sent requests.
                  </p>
                  <details className="group rounded-xl border border-stone-700/60 bg-stone-800/60 px-4 py-3 text-sm text-stone-300 max-w-2xl">
                    <summary className="cursor-pointer list-none font-medium text-stone-200 flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden focus-visible:outline-none rounded-lg -m-1 p-1">
                      <span>How these metrics work</span>
                      <span className="text-stone-500 transition-transform group-open:rotate-180 text-xs" aria-hidden>{'\u25BC'}</span>
                    </summary>
                    <div className="mt-3 space-y-2 text-stone-400 border-t border-stone-700/60 pt-3">
                      <p>
                        <strong className="text-stone-200">Conversions</strong> uses PostHog when{' '}
                        <code className="text-xs bg-stone-900 border border-stone-600 rounded px-1 py-0.5 text-amber-300/80">POSTHOG_PERSONAL_API_KEY</code> and{' '}
                        <code className="text-xs bg-stone-900 border border-stone-600 rounded px-1 py-0.5 text-amber-300/80">POSTHOG_PROJECT_ID</code> are set (unique customers with{' '}
                        <code className="text-xs bg-stone-900 border border-stone-600 rounded px-1 py-0.5 text-amber-300/80">platform_selected</code>); otherwise the database (tracked email links only).
                      </p>
                      <p>
                        <strong className="text-stone-200">{'Flow \u2605 (PH)'}</strong> is the average in-app star rating from{' '}
                        <code className="text-xs bg-stone-900 border border-stone-600 rounded px-1 py-0.5 text-amber-300/80">customer_responded</code>, one rating per PostHog person in the window (first tap).
                      </p>
                      <p>
                        <strong className="text-stone-200">{'GBP \u2605'}</strong> is the Google Business listing snapshot, not the widget.{' '}
                        <strong className="text-stone-200">Email conv%</strong>
                        {' is completed dashboard requests \u00F7 sent.'}
                      </p>
                    </div>
                  </details>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                  <label className="sr-only" htmlFor="analytics-days">Date range</label>
                  <select
                    id="analytics-days"
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value, 10))}
                    className={darkControlClass}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                  <label className="sr-only" htmlFor="analytics-tier">Tier filter</label>
                  <select
                    id="analytics-tier"
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className={darkControlClass}
                  >
                    <option value="">All tiers</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="ai">AI</option>
                  </select>
                  <button
                    type="button"
                    onClick={exportCSV}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#C9A961]/40 bg-[#C9A961]/10 text-[#C9A961] px-3 py-2.5 text-sm font-medium transition hover:bg-[#C9A961]/20 hover:border-[#C9A961]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* ── Portfolio breakdown ──────────────────────────────── */}
          {aggregates && (
            <section aria-label="Portfolio counts">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 whitespace-nowrap">Portfolio breakdown</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-stone-200 to-transparent" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  {
                    label: 'Total businesses',
                    value: aggregates.totalBusinesses,
                    icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    ),
                    iconBg: 'bg-stone-100 text-stone-500',
                    topAccent: 'from-stone-300/60',
                  },
                  {
                    label: 'Free',
                    value: aggregates.byTier.free,
                    icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ),
                    iconBg: 'bg-stone-100 text-stone-500',
                    topAccent: 'from-stone-200/80',
                  },
                  {
                    label: 'Pro',
                    value: aggregates.byTier.pro,
                    icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    ),
                    iconBg: 'bg-blue-50 text-blue-500',
                    topAccent: 'from-blue-300/50',
                  },
                  {
                    label: 'AI',
                    value: aggregates.byTier.ai,
                    icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ),
                    iconBg: 'bg-purple-50 text-purple-500',
                    topAccent: 'from-purple-300/50',
                  },
                  {
                    label: 'Requests sent',
                    value: aggregates.totalRequestsSent,
                    icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    ),
                    iconBg: 'bg-amber-50 text-amber-600',
                    topAccent: 'from-amber-300/50',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="relative rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm ring-1 ring-stone-900/4 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${item.topAccent} to-transparent`} aria-hidden />
                    <div className={`inline-flex p-2 rounded-xl mb-3 ${item.iconBg}`}>
                      {item.icon}
                    </div>
                    <div className="text-3xl font-bold tabular-nums text-stone-900 tracking-tight">{item.value.toLocaleString()}</div>
                    <div className="text-xs font-medium text-stone-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Activity summary ─────────────────────────────────── */}
          {aggregates && (
            <section aria-label="Activity summary">
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 whitespace-nowrap">Activity &mdash; last {days} days</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-stone-200 to-transparent" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  {
                    label: 'Avg email conv.',
                    value: `${aggregates.avgConversionRate}%`,
                    hint: 'Mean of per-business email conv% (completed \u00F7 sent)',
                    cardBg: 'bg-gradient-to-br from-emerald-50/60 to-white',
                    accentBorder: 'border-l-4 border-l-emerald-500',
                    icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ),
                    iconBg: 'bg-emerald-100 text-emerald-600',
                  },
                  {
                    label: 'Star taps',
                    value: aggregates.totalRatingTaps,
                    hint: 'Public rating page, all stars',
                    cardBg: 'bg-gradient-to-br from-amber-50/50 to-white',
                    accentBorder: 'border-l-4 border-l-amber-400',
                    icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ),
                    iconBg: 'bg-amber-100 text-amber-600',
                  },
                  {
                    label: '5\u2605 taps',
                    value: aggregates.totalFiveStarTaps,
                    hint: 'Public rating page',
                    cardBg: 'bg-gradient-to-br from-amber-50/60 to-white',
                    accentBorder: 'border-l-4 border-l-amber-500',
                    icon: (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ),
                    iconBg: 'bg-amber-100 text-amber-600',
                  },
                  {
                    label: 'Private feedback',
                    value: aggregates.totalPrivateFeedback,
                    hint: '1\u20134\u2605 private form',
                    cardBg: 'bg-gradient-to-br from-sky-50/50 to-white',
                    accentBorder: 'border-l-4 border-l-sky-400',
                    icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    ),
                    iconBg: 'bg-sky-100 text-sky-600',
                  },
                  {
                    label: conversionsSource === 'posthog' ? 'Conversions (PH)' : 'Conversions (DB)',
                    value: aggregates.totalTrackedPlatformClicks,
                    hint:
                      conversionsSource === 'posthog'
                        ? 'PostHog: unique persons with platform_selected in period'
                        : 'Database: completed review requests with platform_selected',
                    cardBg: 'bg-gradient-to-br from-green-50/50 to-white',
                    accentBorder: 'border-l-4 border-l-green-500',
                    icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
                      </svg>
                    ),
                    iconBg: 'bg-green-100 text-green-600',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    title={item.hint}
                    className={`rounded-2xl border border-stone-200/80 p-5 cursor-default shadow-sm ring-1 ring-stone-900/4 overflow-hidden group hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${item.cardBg} ${item.accentBorder}`}
                  >
                    <div className={`inline-flex p-2 rounded-xl mb-3 ${item.iconBg}`}>
                      {item.icon}
                    </div>
                    <div className="text-3xl font-bold tabular-nums text-stone-900 tracking-tight">
                      {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
                    </div>
                    <div className="text-xs font-medium text-stone-600 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Top businesses chart ─────────────────────────────── */}
          {!loading && !error && data.length > 0 && (
            <section
              aria-labelledby="analytics-top-businesses-heading"
              className="rounded-2xl border border-stone-200/80 bg-white shadow-sm ring-1 ring-stone-900/4 overflow-hidden"
            >
              {/* Chart card header band */}
              <div className="border-b border-stone-100 bg-gradient-to-r from-stone-50 to-white px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 id="analytics-top-businesses-heading" className="text-base font-semibold text-stone-900">
                      Top businesses
                    </h2>
                    <p className="text-sm text-stone-500 mt-0.5">
                      {`${chartMeta.title} \u2014 ${chartMeta.subtitle}. Showing top 10 (respects search).`}
                    </p>
                  </div>
                  <div
                    className="flex items-center rounded-xl bg-stone-100 p-1 gap-0.5 self-start sm:self-auto shrink-0"
                    role="group"
                    aria-label="Chart metric"
                  >
                    {([
                      { value: 'conversions', label: 'Conversions' },
                      { value: 'stars', label: 'Star taps' },
                      { value: 'fiveStar', label: '5\u2605 taps' },
                    ] as const).map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setChartMetric(m.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961] ${
                          chartMetric === m.value
                            ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-900/10'
                            : 'text-stone-500 hover:text-stone-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                {chartRows.length === 0 ? (
                  <p className="text-sm text-stone-500 py-10 text-center">No rows match your search.</p>
                ) : (
                  <AnalyticsTopBusinessesChart chartRows={chartRows} chartMeta={chartMeta} />
                )}
              </div>
            </section>
          )}

          {/* ── Search + count ───────────────────────────────────── */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <label htmlFor="biz-search" className="block text-xs font-medium text-stone-500 mb-1.5">
                Search businesses
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  id="biz-search"
                  type="search"
                  placeholder="Filter by business name\u2026"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  className="rounded-xl border border-stone-200/90 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm transition hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A961] focus-visible:ring-offset-2 w-full pl-9"
                />
              </div>
            </div>
            {!loading && !error && (
              <div className="pb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 bg-stone-100 rounded-full px-3 py-1.5 tabular-nums ring-1 ring-stone-200/80">
                  {sorted.length === data.length
                    ? `${data.length} ${data.length === 1 ? 'business' : 'businesses'}`
                    : `${sorted.length} of ${data.length}`}
                </span>
              </div>
            )}
          </div>

          {/* ── Table ────────────────────────────────────────────── */}
          {loading ? (
            <div
              className="rounded-2xl border border-stone-200/80 bg-white p-8 shadow-sm ring-1 ring-stone-900/4 space-y-4 animate-pulse"
              role="status"
              aria-live="polite"
            >
              <span className="sr-only">Loading analytics</span>
              <div className="h-9 bg-stone-100 rounded-xl w-2/5 max-w-sm" />
              <div className="h-52 bg-stone-100 rounded-xl" />
              <div className="h-40 bg-stone-100 rounded-xl" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
          ) : (
            <div className="rounded-2xl border border-stone-200/80 bg-white shadow-sm overflow-hidden ring-1 ring-stone-900/4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-stone-900 to-stone-800">
                    <tr>
                      <Th col="businessName" label="Business" />
                      <Th col="tier" label="Tier" />
                      <Th col="ratingTapsTotal" label="Stars" title="Star taps on public page (period)" />
                      <Th col="ratingTapsFiveStar" label="5\u2605" title="Five-star taps (period)" />
                      <Th col="privateFeedbackCount" label="Priv" title="Private feedback submissions (period)" />
                      <Th col="fiveStarSharePct" label="Conv%" title="Platform clicks \u00F7 all star taps \u2014 overall funnel conversion rate" />
                      <Th
                        col="platformClicksTotal"
                        label={conversionsSource === 'posthog' ? 'Conv (PH)' : 'Conv'}
                        title={
                          conversionsSource === 'posthog'
                            ? 'PostHog: unique persons who fired platform_selected in this period. Hover for raw event counts by platform.'
                            : 'Database: completed review requests with a recorded platform (tracked email link). Hover for split.'
                        }
                      />
                      <Th col="requestsSent" label="Sent" title="Review requests sent in period" />
                      <Th
                        col="conversionRate"
                        label="Email%"
                        title="Completed review requests \u00F7 sent (dashboard email/SMS flow only)"
                      />
                      <Th
                        col="customerFlowAvgRating"
                        label={flowRatingSource === 'posthog' ? 'Flow \u2605 (PH)' : 'Flow \u2605'}
                        title={
                          flowRatingSource === 'posthog'
                            ? 'PostHog: average of first customer_responded rating (1\u20135) per unique person in this period. Hover row for rater count.'
                            : 'Set POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID to load from PostHog.'
                        }
                      />
                      <Th
                        col="currentRating"
                        label="GBP \u2605"
                        title="Google Business Profile snapshot: average rating on Google (not in-app taps)"
                      />
                      <Th col="reviewsThisMonth" label="+Rev/Mo" />
                      <Th col="googleRevenue" label="Google Rev" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {sorted.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <svg className="w-8 h-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                            </svg>
                            <span className="text-stone-400 text-sm">No businesses found.</span>
                          </div>
                        </td>
                      </tr>
                    ) : sorted.map((biz, idx) => (
                      <tr
                        key={biz.businessId}
                        className={`cursor-pointer transition-all duration-150 hover:bg-amber-50/60 hover:shadow-[inset_3px_0_0_#C9A961] ${idx % 2 === 1 ? 'bg-stone-50/40' : 'bg-white'}`}
                        onClick={() => router.push(`/admin/businesses/${biz.businessId}`)}
                      >
                        <td className="px-3 py-3">
                          <div className="font-semibold text-stone-900">{biz.businessName}</div>
                          {biz.hasGoogleConnected && (
                            <div className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                              <span className="text-[8px]">{'\u25CF'}</span> Google connected
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3"><TierBadge tier={biz.tier} /></td>
                        <td className="px-3 py-3 text-stone-700 tabular-nums">{biz.ratingTapsTotal}</td>
                        <td className="px-3 py-3 text-amber-700 font-semibold tabular-nums">{biz.ratingTapsFiveStar}</td>
                        <td className="px-3 py-3 text-stone-600 tabular-nums">{biz.privateFeedbackCount}</td>
                        <td className="px-3 py-3 tabular-nums" title="Platform clicks \u00F7 all star taps in this period">
                          {(() => {
                            const pct = biz.ratingTapsTotal > 0
                              ? Math.round((biz.platformClicksTotal / biz.ratingTapsTotal) * 100)
                              : null
                            return pct !== null
                              ? <span className={pct >= 20 ? 'text-emerald-600 font-semibold' : 'text-stone-600'}>{pct}%</span>
                              : <span className="text-stone-400">{'\u2014'}</span>
                          })()}
                        </td>
                        <td
                          className="px-3 py-3 text-emerald-700 font-semibold tabular-nums"
                          title={
                            biz.platformClicksTotal === 0
                              ? 'No conversions in this period (tracked platform opens only)'
                              : `Conversions by platform \u2014 Google ${biz.platformGoogle}, Facebook ${biz.platformFacebook}, Yelp ${biz.platformYelp}, Nextdoor ${biz.platformNextdoor}`
                          }
                        >
                          {biz.platformClicksTotal}
                        </td>
                        <td className="px-3 py-3 text-stone-700 tabular-nums">{biz.requestsSent}</td>
                        <td className="px-3 py-3">
                          <span className={biz.conversionRate >= 20 ? 'text-emerald-600 font-semibold' : 'text-stone-600'}>
                            {biz.conversionRate}%
                          </span>
                        </td>
                        <td
                          className="px-3 py-3 text-sky-700 font-semibold tabular-nums"
                          title={
                            biz.customerFlowAvgRating !== null && biz.customerFlowUniqueRaters != null
                              ? `PostHog: ${biz.customerFlowUniqueRaters} unique people (first rating in window)`
                              : undefined
                          }
                        >
                          {biz.customerFlowAvgRating !== null ? (
                            <span>{`${biz.customerFlowAvgRating.toFixed(1)}\u2605`}</span>
                          ) : (
                            <span className="text-stone-300">{'\u2014'}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {biz.currentRating !== null ? (
                            <span className="text-amber-600 font-semibold">{`${biz.currentRating.toFixed(1)}\u2605`}</span>
                          ) : <span className="text-stone-300">{'\u2014'}</span>}
                        </td>
                        <td className="px-3 py-3">
                          {biz.reviewsThisMonth !== null ? (
                            <span className={biz.reviewsThisMonth > 0 ? 'text-emerald-600 font-semibold' : 'text-stone-400'}>
                              {biz.reviewsThisMonth > 0 ? `+${biz.reviewsThisMonth}` : '0'}
                            </span>
                          ) : <span className="text-stone-300">{'\u2014'}</span>}
                        </td>
                        <td className="px-3 py-3">
                          {biz.googleRevenue > 0 ? (
                            <span className="text-emerald-600 font-semibold">{fmt$(biz.googleRevenue)}</span>
                          ) : <span className="text-stone-300">{'\u2014'}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  )
}
