/**
 * /dashboard/analytics
 * Automated Performance Tracking Dashboard
 * Shows: Review funnel, Google stats
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import AppLayout from '../../components/AppLayout'

// ── Types ─────────────────────────────────────────────────────

interface FunnelData {
  sent: number
  opened: number
  clicked: number
  completed: number
  posted: number
  openRate: number
  clickRate: number
  completionRate: number
  platformBreakdown: Record<string, number>
}

interface Snapshot {
  snapshot_date: string
  total_reviews: number
  average_rating: number
  reviews_this_week: number
  reviews_this_month: number
  rating_change_week: number
  rating_change_month: number
}

interface GoogleStats {
  current: { total_reviews: number; average_rating: number; last_fetched: string } | null
  snapshots: Snapshot[]
  deltas: {
    reviews_this_week: number
    reviews_this_month: number
    rating_change_week: number
    rating_change_month: number
  }
}

interface DashboardData {
  businessName: string
  tier: string
  funnel: FunnelData
  googleStats: GoogleStats | null
}

// ── Helpers ───────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function delta(n: number, suffix = '') {
  if (n === 0) return <span className="text-gray-400 text-sm">—</span>
  const positive = n > 0
  return (
    <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
      {positive ? '▲' : '▼'} {Math.abs(n)}{suffix}
    </span>
  )
}

// ── Subcomponents ─────────────────────────────────────────────

function StatCard({ label, value, sub, accent = false }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-3xl font-bold ${accent ? 'text-amber-700' : 'text-gray-900'}`}>{value}</div>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

type DateRange = 7 | 30 | 90

// ── Main Page ─────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>(30)
  const [activeTab, setActiveTab] = useState<'funnel' | 'google'>('funnel')
  const [primaryColor, setPrimaryColor] = useState('#4A3428')
  const [businessName, setBusinessName] = useState('')
  const [tier, setTier] = useState<'free' | 'pro' | 'ai'>('free')

  const fetchData = useCallback(async (days: DateRange) => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Get primary color from business
      const bizRes = await fetch('/api/my-business', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (bizRes.ok) {
        const bizData = await bizRes.json()
        if (bizData.business?.primary_color) setPrimaryColor(bizData.business.primary_color)
        if (bizData.business?.business_name) setBusinessName(bizData.business.business_name)
        if (bizData.business?.tier) setTier(bizData.business.tier)
      }

      const res = await fetch(`/api/analytics/dashboard-data?days=${days}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Failed to load analytics')
        return
      }
      const result = await res.json()
      setData(result)
    } catch {
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData(dateRange)
  }, [dateRange, fetchData])

  const TABS = [
    { key: 'funnel', label: 'Review Funnel' },
    { key: 'google', label: 'Google Stats' },
  ] as const

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <AppLayout businessName={businessName} tier={tier} onLogout={handleLogout}>
      <Head>
        <title>Analytics — ReviewFlo</title>
      </Head>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Automated tracking • Updated daily</p>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {([7, 30, 90] as DateRange[]).map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={`px-3 py-1.5 transition-colors ${
                  dateRange === d
                    ? 'text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                style={dateRange === d ? { backgroundColor: primaryColor } : undefined}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: primaryColor }} />
          </div>
        )}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
        )}

        {/* Content */}
        {!loading && !error && data && (
          <>
            {/* ── Review Funnel Tab ── */}
            {activeTab === 'funnel' && (
              <div className="space-y-6">
                <SectionHeader
                  title="Review Request Funnel"
                  subtitle={`Last ${dateRange} days — tracks each stage from send to completion`}
                />

                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: 'Sent', value: data.funnel.sent, sub: null },
                    { label: 'Opened', value: data.funnel.opened, sub: `${data.funnel.openRate}%` },
                    { label: 'Clicked', value: data.funnel.clicked, sub: data.funnel.opened > 0 ? `${data.funnel.clickRate}% of opened` : null },
                    { label: 'Completed', value: data.funnel.completed, sub: `${data.funnel.completionRate}% of sent` },
                    { label: 'Posted', value: data.funnel.posted, sub: 'Estimated' },
                  ].map((item) => (
                    <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{item.label}</div>
                      {item.sub && <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Visual funnel */}
                {data.funnel.sent > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Conversion Steps</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Sent', value: data.funnel.sent, pct: 100 },
                        { label: 'Opened', value: data.funnel.opened, pct: data.funnel.openRate },
                        { label: 'Clicked Platform', value: data.funnel.clicked, pct: data.funnel.sent > 0 ? Math.round((data.funnel.clicked / data.funnel.sent) * 100) : 0 },
                        { label: 'Completed', value: data.funnel.completed, pct: data.funnel.completionRate },
                      ].map((step, i) => (
                        <div key={step.label} className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500 flex-shrink-0">
                            {i + 1}
                          </div>
                          <div className="w-28 flex-shrink-0 text-sm text-gray-600">{step.label}</div>
                          <div className="flex-1">
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${step.pct}%`, backgroundColor: primaryColor, opacity: 1 - i * 0.15 }}
                              />
                            </div>
                          </div>
                          <div className="w-20 flex-shrink-0 text-right">
                            <span className="text-sm font-semibold text-gray-700">{step.value}</span>
                            <span className="text-xs text-gray-400 ml-1">({step.pct}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-8 text-center">
                    <p className="text-gray-500 text-sm">No review requests sent in the last {dateRange} days.</p>
                    <Link href="/dashboard" className="mt-2 inline-block text-sm font-medium" style={{ color: primaryColor }}>
                      Send your first request →
                    </Link>
                  </div>
                )}

                {/* Platform breakdown */}
                {Object.keys(data.funnel.platformBreakdown).length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Platform Clicks</h3>
                    <div className="space-y-2">
                      {Object.entries(data.funnel.platformBreakdown).map(([platform, count]) => (
                        <div key={platform} className="flex items-center justify-between text-sm">
                          <span className="capitalize text-gray-600">{platform}</span>
                          <span className="font-semibold text-gray-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Google Stats Tab ── */}
            {activeTab === 'google' && (
              <div className="space-y-6">
                <SectionHeader
                  title="Google Business Stats"
                  subtitle="Auto-updated daily via Google Places API"
                />

                {!data.googleStats ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                    Google stats require a Pro or AI plan, and a connected Google Business Profile.
                  </div>
                ) : (
                  <>
                    {/* Current stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <StatCard
                        label="Total Reviews"
                        value={data.googleStats.current?.total_reviews ?? '—'}
                        sub={delta(data.googleStats.deltas.reviews_this_week, ' this week')}
                      />
                      <StatCard
                        label="Average Rating"
                        value={data.googleStats.current?.average_rating.toFixed(1) ?? '—'}
                        sub={delta(data.googleStats.deltas.rating_change_week, '★ this week')}
                        accent
                      />
                      <StatCard
                        label="New (7 days)"
                        value={data.googleStats.deltas.reviews_this_week >= 0 ? `+${data.googleStats.deltas.reviews_this_week}` : data.googleStats.deltas.reviews_this_week}
                        sub={<span className="text-xs text-gray-400">vs 7 days ago</span>}
                      />
                      <StatCard
                        label="New (30 days)"
                        value={data.googleStats.deltas.reviews_this_month >= 0 ? `+${data.googleStats.deltas.reviews_this_month}` : data.googleStats.deltas.reviews_this_month}
                        sub={<span className="text-xs text-gray-400">vs 30 days ago</span>}
                      />
                    </div>

                    {/* Charts */}
                    {data.googleStats.snapshots.length > 1 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Review count chart */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                          <div className="text-sm font-semibold text-gray-700 mb-4">Review Count Over Time</div>
                          <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={data.googleStats.snapshots}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="snapshot_date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip
                                labelFormatter={formatDate as any}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                formatter={((val: unknown) => [val, 'Reviews']) as any}
                              />
                              <Line
                                type="monotone"
                                dataKey="total_reviews"
                                stroke={primaryColor}
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Rating chart */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                          <div className="text-sm font-semibold text-gray-700 mb-4">Rating Over Time</div>
                          <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={data.googleStats.snapshots}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="snapshot_date" tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                              <YAxis domain={[3.5, 5]} tick={{ fontSize: 11 }} />
                              <Tooltip
                                labelFormatter={formatDate as any}
                                formatter={(val: unknown) => [(val as number).toFixed(2), "Rating"] as [string, string]}
                              />
                              <Line
                                type="monotone"
                                dataKey="average_rating"
                                stroke="#FBBF24"
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-2xl p-6 text-sm text-gray-500 text-center">
                        Charts appear after 2+ days of data. Check back tomorrow.
                      </div>
                    )}

                    {data.googleStats.current?.last_fetched && (
                      <p className="text-xs text-gray-400 text-right">
                        Last updated: {new Date(data.googleStats.current.last_fetched).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </AppLayout>
  )
}
