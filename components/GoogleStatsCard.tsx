import { useState, useEffect, useCallback } from 'react'

type SortOption = 'recent' | 'lowest' | 'highest'

interface Review {
  author?: string
  rating?: number
  text?: string
  time?: number
}

interface Stats {
  total_reviews: number | null
  average_rating: number | null
  recent_reviews: Review[]
  reviews_this_month: number | null
  last_fetched: string
}

interface GoogleStatsCardProps {
  primaryColor: string
}

export default function GoogleStatsCard({ primaryColor }: GoogleStatsCardProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('recent')

  const fetchStats = async () => {
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/google-stats/fetch', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok && data.stats) setStats(data.stats)
      else setStats(null)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  // Auto-refresh when user lands on dashboard (after login)
  useEffect(() => {
    let cancelled = false
    const runRefresh = async () => {
      try {
        const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession()
        if (!session || cancelled) return
        const res = await fetch('/api/google-stats/refresh', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (cancelled) return
        if (res.ok) await fetchStats()
      } catch {
        // Silent fail for auto-refresh
      }
    }
    runRefresh()
    return () => { cancelled = true }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError('')
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/google-stats/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok) {
        await fetchStats()
      } else {
        setError(data.error || 'Failed to refresh')
      }
    } catch {
      setError('Failed to refresh')
    } finally {
      setRefreshing(false)
    }
  }

  const sortReviews = useCallback((reviews: Review[], option: SortOption): Review[] => {
    const copy = [...reviews]
    switch (option) {
      case 'lowest':
        return copy.sort((a, b) =>
          (a.rating ?? 5) - (b.rating ?? 5) || (b.time ?? 0) - (a.time ?? 0))
      case 'highest':
        return copy.sort((a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) || (b.time ?? 0) - (a.time ?? 0))
      case 'recent':
      default:
        return copy.sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
    }
  }, [])

  const timeAgo = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-12 bg-gray-200 rounded w-1/4 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
      <h2 className="text-xl font-semibold text-slate-800 tracking-tight mb-6">
        Your Google Business Stats
      </h2>
      {stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 uppercase">Avg Rating</p>
              <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                ⭐ {(stats.average_rating ?? 0).toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 uppercase">Total Reviews</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total_reviews ?? 0}</p>
            </div>
            {stats.reviews_this_month != null && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 uppercase">This Month</p>
                <p className="text-2xl font-bold text-slate-800">+{stats.reviews_this_month}</p>
              </div>
            )}
          </div>
          {stats.recent_reviews && stats.recent_reviews.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  All Reviews ({stats.recent_reviews.length})
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 mr-1">Sort:</span>
                  {(['recent', 'highest', 'lowest'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSortBy(opt)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        sortBy === opt
                          ? 'bg-slate-200 text-slate-800'
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {opt === 'recent' ? 'Recent' : opt === 'highest' ? 'Highest' : 'Lowest'}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className={`space-y-3 ${stats.recent_reviews.length > 8 ? 'max-h-[420px] overflow-y-auto pr-1' : ''}`}
              >
                {sortReviews(stats.recent_reviews, sortBy).map((r, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800">{r.author || 'Anonymous'}</span>
                      <span className="text-amber-500">{'★'.repeat(r.rating || 0)}</span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-slate-600 mb-6">
          Add your Google Review URL in Settings and click Refresh to automatically fetch your Google Business Profile stats.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}
      <div className="flex items-center justify-between">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium text-sm disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh Stats'}
        </button>
        {stats?.last_fetched && (
          <p className="text-xs text-slate-500">Last updated: {timeAgo(stats.last_fetched)}</p>
        )}
      </div>
    </div>
  )
}
