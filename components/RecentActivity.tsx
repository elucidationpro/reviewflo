import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { GbpFullReview } from '../pages/api/google-reviews/list'

interface RecentActivityProps {
  /** Pre-fetched GBP reviews from the parent. Pass [] if Google not available. */
  reviews: GbpFullReview[]
  /** True while parent is loading GBP reviews. */
  reviewsLoading?: boolean
  /** When true, show the reviews column (Pro/AI + OAuth). */
  showGoogleReviews: boolean
}

interface ReviewRequestRow {
  id: string
  customer_name: string | null
  customer_email: string | null
  sent_at: string
  status: string
}

const STAR_RATING_TO_NUMBER: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
}

const REQUEST_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Sent', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  opened: { label: 'Opened', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  clicked: { label: 'Clicked', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  feedback: { label: 'Feedback', cls: 'bg-gray-50 text-gray-700 border-gray-200' },
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diffMs = now - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function truncateSnippet(text: string, max = 80): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3 h-3 ${s <= rating ? 'text-[#C9A961]' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ))}
    </div>
  )
}

export default function RecentActivity({
  reviews,
  reviewsLoading = false,
  showGoogleReviews,
}: RecentActivityProps) {
  const [requests, setRequests] = useState<ReviewRequestRow[] | null>(null)
  const [requestsLoading, setRequestsLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          setRequests([])
          return
        }
        const res = await fetch('/api/review-requests/list?page=1', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) {
          setRequests([])
          return
        }
        const json = await res.json()
        setRequests((json.requests ?? []).slice(0, 5))
      } catch {
        setRequests([])
      } finally {
        setRequestsLoading(false)
      }
    })()
  }, [])

  const recentReviews = [...reviews]
    .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
    .slice(0, 5)

  const noRequests = !requestsLoading && (!requests || requests.length === 0)
  const noReviews =
    !reviewsLoading && (!showGoogleReviews || recentReviews.length === 0)
  const fullyEmpty = noRequests && noReviews

  return (
    <div
      className="bg-white rounded-2xl border border-[#4A3428]/6 overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
    >
      <div className="p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">Recent activity</h2>

        {fullyEmpty ? (
          <p className="text-sm text-gray-600 text-center py-8">
            No activity yet — send your first review request to get started.{' '}
            <Link href="/dashboard/outreach" className="font-semibold text-[#4A3428] hover:underline">
              Go to Outreach
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent reviews */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#4A3428]/50 uppercase tracking-widest">
                  Latest Google reviews
                </h3>
                {showGoogleReviews && (
                  <Link
                    href="/dashboard/reviews"
                    className="text-xs font-semibold text-[#4A3428] hover:underline"
                  >
                    View all →
                  </Link>
                )}
              </div>

              {!showGoogleReviews ? (
                <p className="text-xs text-gray-500 py-2">
                  Upgrade to Pro and connect Google to see reviews here.
                </p>
              ) : reviewsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : recentReviews.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">No reviews yet.</p>
              ) : (
                <ul className="space-y-3">
                  {recentReviews.map((r) => {
                    const rating = STAR_RATING_TO_NUMBER[r.starRating] ?? 0
                    const name = r.reviewer?.isAnonymous
                      ? 'Anonymous'
                      : r.reviewer?.displayName || 'Anonymous'
                    const snippet = r.comment ? truncateSnippet(r.comment, 80) : ''
                    return (
                      <li key={r.name}>
                        <Link
                          href="/dashboard/reviews"
                          className="flex items-start gap-2.5 rounded-lg -mx-1 px-1 py-1 hover:bg-gray-50 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full bg-[#F5F5DC] border border-[#C9A961]/30 flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-[11px] font-bold text-[#4A3428]">
                              {name[0]?.toUpperCase() ?? '?'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-xs font-semibold text-gray-900 truncate">{name}</p>
                              <StarRow rating={rating} />
                            </div>
                            {snippet ? (
                              <p className="text-xs text-gray-600 line-clamp-2">{snippet}</p>
                            ) : (
                              <p className="text-xs text-gray-400 italic">Rating only.</p>
                            )}
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {formatRelative(r.createTime)}
                            </p>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Recent requests */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#4A3428]/50 uppercase tracking-widest">
                  Requests sent
                </h3>
                <Link
                  href="/dashboard/outreach"
                  className="text-xs font-semibold text-[#4A3428] hover:underline"
                >
                  View all →
                </Link>
              </div>

              {requestsLoading ? (
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : !requests || requests.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">
                  No requests sent yet.{' '}
                  <Link href="/dashboard/outreach" className="text-[#4A3428] font-semibold hover:underline">
                    Send your first →
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {requests.map((req) => {
                    const status =
                      REQUEST_STATUS_LABEL[req.status] ?? {
                        label: req.status,
                        cls: 'bg-gray-50 text-gray-700 border-gray-200',
                      }
                    const label = req.customer_name?.trim() || req.customer_email?.trim() || 'Customer'
                    return (
                      <li key={req.id}>
                        <Link
                          href="/dashboard/outreach"
                          className="flex items-center justify-between gap-2 rounded-lg -mx-1 px-1 py-1 hover:bg-gray-50 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{label}</p>
                            {req.customer_email && req.customer_name?.trim() ? (
                              <p className="text-[11px] text-gray-500 truncate">{req.customer_email}</p>
                            ) : null}
                            <p className="text-[11px] text-gray-400">{formatRelative(req.sent_at)}</p>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.cls} shrink-0`}
                          >
                            {status.label}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
