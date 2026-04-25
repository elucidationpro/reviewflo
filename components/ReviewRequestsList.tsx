import { useState, useEffect } from 'react'
import { canSendFromDashboard } from '../lib/tier-permissions'

interface ReviewRequest {
  id: string
  customer_name: string
  customer_email: string | null
  sent_at: string | null
  scheduled_for?: string | null
  send_status?: 'pending' | 'scheduled' | 'sent' | 'failed'
  status: 'pending' | 'opened' | 'clicked' | 'completed' | 'feedback'
  reminder_sent: boolean
}

interface ReviewRequestsListProps {
  businessId: string
  businessSlug: string
  tier: 'free' | 'pro' | 'ai'
  onSendRequest: () => void
  /** When false, hide the header Send button (parent page owns the primary CTA). */
  showSendButton?: boolean
  refetchTrigger?: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800',
  opened: 'bg-yellow-100 text-yellow-800',
  clicked: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  feedback: 'bg-gray-100 text-gray-800',
}

const SEND_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-indigo-100 text-indigo-800',
  sent: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-slate-100 text-slate-800',
}

function formatWhen(r: ReviewRequest): string {
  const iso = r.send_status === 'scheduled' ? (r.scheduled_for || null) : (r.sent_at || null)
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function ReviewRequestsList({
  businessId,
  businessSlug,
  tier,
  onSendRequest,
  showSendButton = true,
  refetchTrigger = 0,
}: ReviewRequestsListProps) {
  const [requests, setRequests] = useState<ReviewRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [stats, setStats] = useState({ sent: 0, opened: 0, completed: 0, openRate: 0, completionRate: 0 })

  const fetchRequests = async (pageNum = 1, searchVal = search, statusVal = statusFilter) => {
    setLoading(true)
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession()
      if (!session) return

      const params = new URLSearchParams({ page: String(pageNum) })
      if (searchVal) params.set('search', searchVal)
      if (statusVal && statusVal !== 'all') params.set('status', statusVal)

      const res = await fetch(`/api/review-requests/list?${params}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok && data.requests) {
        setRequests(data.requests)
        setTotal(data.total ?? 0)
        setPage(data.page ?? 1)
      }
    } catch (err) {
      console.error('Failed to fetch review requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/review-requests/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!canSendFromDashboard(tier)) return
    fetchRequests()
    fetchStats()
  }, [tier, refetchTrigger])

  const handleSearch = () => {
    fetchRequests(1, search, statusFilter)
  }

  const handleFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus)
    fetchRequests(1, search, newStatus)
  }

  return (
    <div
      className="bg-white rounded-2xl border border-[#4A3428]/6 p-6 md:p-8 mb-8"
      style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">
            Review requests
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            Everyone you&apos;ve emailed from the dashboard. Search, filter, and track status.
          </p>
        </div>
        {showSendButton && (
          <button
            type="button"
            onClick={onSendRequest}
            className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#4A3428] text-white hover:bg-[#4A3428]/90 transition-colors cursor-pointer"
          >
            Send request
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-[#F5F5DC]/40 rounded-xl border border-[#C9A961]/15">
          <p className="text-[11px] text-gray-600 uppercase tracking-wide font-medium">Sent (month)</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.sent}</p>
        </div>
        <div className="p-3 bg-[#F5F5DC]/40 rounded-xl border border-[#C9A961]/15">
          <p className="text-[11px] text-gray-600 uppercase tracking-wide font-medium">Opened</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.opened}</p>
        </div>
        <div className="p-3 bg-[#F5F5DC]/40 rounded-xl border border-[#C9A961]/15">
          <p className="text-[11px] text-gray-600 uppercase tracking-wide font-medium">Completed</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.completed}</p>
        </div>
        <div className="p-3 bg-[#F5F5DC]/40 rounded-xl border border-[#C9A961]/15">
          <p className="text-[11px] text-gray-600 uppercase tracking-wide font-medium">Completion rate</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{stats.completionRate}%</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#C9A961]/40 focus:border-[#C9A961] outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="completed">Completed</option>
          <option value="feedback">Feedback</option>
        </select>
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
        >
          Search
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-500 text-sm">Loading…</div>
      ) : requests.length === 0 ? (
        <div className="py-10 text-center text-gray-500 text-sm px-4">
          {showSendButton ? (
            <>No review requests yet. Use <strong className="text-gray-700">Send request</strong> above to send your first one.</>
          ) : (
            <>No review requests match your filters, or you haven&apos;t sent any yet. Use <strong className="text-gray-700">New review request</strong> at the top of this page.</>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Delivery</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F5F5DC]/25">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.customer_name}</p>
                      <p className="text-sm text-gray-500">{r.customer_email || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex flex-col gap-1">
                        <span>{formatWhen(r)}</span>
                        {r.send_status && (
                          <span
                            className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              SEND_STATUS_COLORS[r.send_status] || 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {r.send_status === 'scheduled' ? 'scheduled' : r.send_status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 20 && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => fetchRequests(page + 1)}
                className="px-4 py-2 text-sm font-semibold text-[#4A3428] hover:underline cursor-pointer"
              >
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
