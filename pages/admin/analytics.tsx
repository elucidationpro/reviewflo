/**
 * /admin/analytics
 * Admin view: all users' performance at a glance.
 * Sortable table, filter by tier, export to CSV.
 */
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'
import AdminLayout from '@/components/AdminLayout'

interface BusinessAnalytics {
  businessId: string
  businessName: string
  tier: string
  hasGoogleConnected: boolean
  requestsSent: number
  requestsCompleted: number
  conversionRate: number
  currentRating: number | null
  totalReviews: number | null
  reviewsThisMonth: number | null
  ratingChangeMonth: number | null
  googleRevenue: number
  totalRevenue: number
  attributionPct: number
  roi: number | null
  monthlyCost: number
}

interface Aggregates {
  totalBusinesses: number
  byTier: { free: number; pro: number; ai: number }
  totalRequestsSent: number
  avgConversionRate: number
  totalGoogleRevenue: number
  businessesWithGoogleConnected: number
}

type SortKey = keyof BusinessAnalytics
type SortDir = 'asc' | 'desc'

function fmt$(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    pro: 'bg-blue-100 text-blue-700',
    ai: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[tier] || 'bg-gray-100'}`}>
      {tier}
    </span>
  )
}

export default function AdminAnalytics() {
  const router = useRouter()
  const [data, setData] = useState<BusinessAnalytics[]>([])
  const [aggregates, setAggregates] = useState<Aggregates | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)
  const [tierFilter, setTierFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('requestsSent')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const params = new URLSearchParams({ days: String(days) })
      if (tierFilter) params.set('tier', tierFilter)

      const res = await fetch(`/api/admin/all-analytics?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.status === 403) { router.push('/dashboard'); return }
      if (!res.ok) { setError('Failed to load analytics'); return }
      const result = await res.json()
      setData(result.analytics || [])
      setAggregates(result.aggregates || null)
    } catch {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [days, tierFilter, router])

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

  const exportCSV = () => {
    const headers = ['Business', 'Tier', 'Sent', 'Completed', 'Conv%', 'Rating', 'Reviews', 'New/Mo', 'Rating Δ', 'Google Rev', 'Total Rev', 'Attr%', 'ROI%']
    const rows = sorted.map((b) => [
      b.businessName, b.tier, b.requestsSent, b.requestsCompleted,
      b.conversionRate, b.currentRating ?? '', b.totalReviews ?? '',
      b.reviewsThisMonth ?? '', b.ratingChangeMonth ?? '',
      b.googleRevenue, b.totalRevenue, b.attributionPct, b.roi ?? '',
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
    <span className="ml-1 text-gray-400">
      {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
    </span>
  )

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800 whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {label}<SortIcon col={col} />
    </th>
  )

  return (
    <>
      <Head><title>Admin Analytics — ReviewFlo</title></Head>
      <AdminLayout onLogout={handleLogout}>
        <div className="max-w-7xl mx-auto px-4 py-8">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All users analytics</h1>
              <p className="text-gray-600 text-sm mt-1">Performance across every business</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">All Tiers</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="ai">AI</option>
              </select>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </button>
            </div>
          </div>

          {/* Aggregate KPIs */}
          {aggregates && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
              {[
                { label: 'Total Businesses', value: aggregates.totalBusinesses },
                { label: 'Free', value: aggregates.byTier.free },
                { label: 'Pro', value: aggregates.byTier.pro },
                { label: 'AI', value: aggregates.byTier.ai },
                { label: 'Requests Sent', value: aggregates.totalRequestsSent },
                { label: 'Avg Conversion', value: `${aggregates.avgConversionRate}%` },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search businesses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white w-full sm:w-64"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
              Loading...
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">{error}</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <Th col="businessName" label="Business" />
                      <Th col="tier" label="Tier" />
                      <Th col="requestsSent" label="Sent" />
                      <Th col="conversionRate" label="Conv%" />
                      <Th col="currentRating" label="Rating" />
                      <Th col="reviewsThisMonth" label="+Reviews/Mo" />
                      <Th col="googleRevenue" label="Google Rev" />
                      <Th col="roi" label="ROI%" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sorted.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                          No businesses found.
                        </td>
                      </tr>
                    ) : sorted.map((biz) => (
                      <tr
                        key={biz.businessId}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/admin/businesses/${biz.businessId}`)}
                      >
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900">{biz.businessName}</div>
                          {biz.hasGoogleConnected && (
                            <div className="text-xs text-green-600 mt-0.5">● Google connected</div>
                          )}
                        </td>
                        <td className="px-3 py-3"><TierBadge tier={biz.tier} /></td>
                        <td className="px-3 py-3 text-gray-700">{biz.requestsSent}</td>
                        <td className="px-3 py-3">
                          <span className={biz.conversionRate >= 20 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                            {biz.conversionRate}%
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {biz.currentRating !== null ? (
                            <span className="text-amber-600 font-medium">{biz.currentRating.toFixed(1)}★</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {biz.reviewsThisMonth !== null ? (
                            <span className={biz.reviewsThisMonth > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                              {biz.reviewsThisMonth > 0 ? `+${biz.reviewsThisMonth}` : '0'}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {biz.googleRevenue > 0 ? (
                            <span className="text-green-600 font-medium">{fmt$(biz.googleRevenue)}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3">
                          {biz.roi !== null ? (
                            <span className={`font-medium ${biz.roi >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {biz.roi >= 0 ? '+' : ''}{biz.roi}%
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3 text-right">{sorted.length} businesses shown</p>
        </div>
      </AdminLayout>
    </>
  )
}
