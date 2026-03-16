import { useState, useEffect } from 'react'

interface Stats {
  total_reviews: number
  average_rating: number
  recent_reviews: Array<{ author?: string; rating?: number; text?: string }>
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
                ⭐ {stats.average_rating.toFixed(1)}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 uppercase">Total Reviews</p>
              <p className="text-2xl font-bold text-slate-800">{stats.total_reviews}</p>
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
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Reviews</h3>
              <div className="space-y-3">
                {stats.recent_reviews.slice(0, 5).map((r, i) => (
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
