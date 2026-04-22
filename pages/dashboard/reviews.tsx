'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import AppLayout from '../../components/AppLayout'
import { canAccessGoogleStats } from '../../lib/tier-permissions'
import type { GbpFullReview } from '../api/google-reviews/list'

const STAR_RATING_TO_NUMBER: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
}

type SortOption = 'recent' | 'oldest' | 'highest' | 'lowest'
type FilterOption = 'all' | 'unreplied'

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`${sz} ${s <= rating ? 'text-[#C9A961]' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ))}
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

export default function ReviewsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviews, setReviews] = useState<GbpFullReview[]>([])
  const [business, setBusiness] = useState<{ id: string; business_name: string; tier: string; slug: string } | null>(null)
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0)

  // Sort + filter
  const [sort, setSort] = useState<SortOption>('recent')
  const [filter, setFilter] = useState<FilterOption>('all')
  const [ratingFilter, setRatingFilter] = useState<number[]>([])

  // Reply modal
  const [replyTarget, setReplyTarget] = useState<GbpFullReview | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyPosting, setReplyPosting] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)

  // Read ?filter=unreplied from URL on mount
  useEffect(() => {
    if (!router.isReady) return
    if (router.query.filter === 'unreplied') setFilter('unreplied')
  }, [router.isReady, router.query.filter])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const [bizRes, feedbackRes] = await Promise.all([
        fetch('/api/my-business', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('is_resolved', false),
      ])

      if (!bizRes.ok) { router.replace('/login'); return }
      const bizJson = await bizRes.json()
      const biz = bizJson.business
      setBusiness(biz)
      setPendingFeedbackCount(feedbackRes.count ?? 0)

      if (!canAccessGoogleStats(biz?.tier)) {
        setError('Reviews are available on Pro and AI tiers.')
        setLoading(false)
        return
      }

      const reviewsRes = await fetch('/api/google-reviews/list', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const reviewsJson = await reviewsRes.json()

      if (!reviewsRes.ok) {
        setError(reviewsJson.error ?? 'Failed to load reviews.')
        setLoading(false)
        return
      }

      setReviews(reviewsJson.reviews ?? [])
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sortedFiltered = useMemo(() => {
    let result = [...reviews]

    // Filter
    if (filter === 'unreplied') result = result.filter((r) => !r.reviewReply)
    if (ratingFilter.length > 0) {
      result = result.filter((r) => ratingFilter.includes(STAR_RATING_TO_NUMBER[r.starRating] ?? 0))
    }

    // Sort
    result.sort((a, b) => {
      if (sort === 'recent') return new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
      if (sort === 'oldest') return new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
      const aR = STAR_RATING_TO_NUMBER[a.starRating] ?? 0
      const bR = STAR_RATING_TO_NUMBER[b.starRating] ?? 0
      if (sort === 'highest') return bR - aR
      if (sort === 'lowest') return aR - bR
      return 0
    })

    return result
  }, [reviews, sort, filter, ratingFilter])

  const toggleRatingFilter = (r: number) => {
    setRatingFilter((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r])
  }

  const openReplyModal = (review: GbpFullReview) => {
    setReplyTarget(review)
    setReplyText(review.reviewReply?.comment ?? '')
    setReplyError(null)
  }

  const closeReplyModal = () => {
    setReplyTarget(null)
    setReplyText('')
    setReplyError(null)
  }

  const handlePostReply = async () => {
    if (!replyTarget || !replyText.trim() || replyPosting) return
    setReplyPosting(true)
    setReplyError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { closeReplyModal(); router.replace('/login'); return }

      const res = await fetch('/api/google-reviews/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ review_name: replyTarget.name, comment: replyText.trim() }),
      })
      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = json?.details?.error?.message ?? json?.error ?? 'Failed to post reply.'
        setReplyError(`Reply failed: ${msg}`)
        setReplyPosting(false)
        return
      }

      // Optimistic update
      setReviews((prev) =>
        prev.map((r) =>
          r.name === replyTarget.name
            ? { ...r, reviewReply: { comment: replyText.trim(), updateTime: new Date().toISOString() } }
            : r
        )
      )
      closeReplyModal()
    } catch {
      setReplyError('Something went wrong. Please try again.')
    } finally {
      setReplyPosting(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4A3428]" />
      </div>
    )
  }

  return (
    <AppLayout
      businessName={business?.business_name}
      tier={business?.tier as 'free' | 'pro' | 'ai' | undefined}
      pendingFeedbackCount={pendingFeedbackCount}
      onLogout={handleLogout}
    >
      <Head>
        <title>Reviews — ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="px-6 py-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Google Reviews</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {reviews.length > 0
              ? `${reviews.length} review${reviews.length !== 1 ? 's' : ''} · ${reviews.filter((r) => !r.reviewReply).length} unreplied`
              : 'All your Google reviews in one place'}
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && (
          <>
            {/* Sort + Filter bar */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {/* Sort */}
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
                {(['recent', 'oldest', 'highest', 'lowest'] as SortOption[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSort(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      sort === s
                        ? 'bg-[#4A3428] text-white'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    {s === 'recent' ? 'Recent' : s === 'oldest' ? 'Oldest' : s === 'highest' ? 'Highest ★' : 'Lowest ★'}
                  </button>
                ))}
              </div>

              {/* Filter: replied */}
              <button
                type="button"
                onClick={() => setFilter(filter === 'unreplied' ? 'all' : 'unreplied')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  filter === 'unreplied'
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Unreplied
              </button>

              {/* Filter: by star rating */}
              {[5, 4, 3, 2, 1].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRatingFilter(r)}
                  className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                    ratingFilter.includes(r)
                      ? 'bg-[#F5F5DC]/60 border-[#C9A961] text-[#4A3428]'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {r}
                  <svg className="w-3 h-3 text-[#C9A961]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              ))}

              {/* Clear filters */}
              {(filter !== 'all' || ratingFilter.length > 0) && (
                <button
                  type="button"
                  onClick={() => { setFilter('all'); setRatingFilter([]) }}
                  className="px-2.5 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Empty state */}
            {reviews.length === 0 && (
              <div className="py-16 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F5F5DC] border border-[#C9A961]/30 mb-4">
                  <svg className="w-7 h-7 text-[#C9A961]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  No reviews yet. Once customers leave Google reviews, they&apos;ll appear here.
                </p>
              </div>
            )}

            {/* No results after filter */}
            {reviews.length > 0 && sortedFiltered.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400">No reviews match your current filters.</p>
                <button
                  type="button"
                  onClick={() => { setFilter('all'); setRatingFilter([]) }}
                  className="mt-2 text-xs text-[#4A3428] font-semibold hover:underline cursor-pointer"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Review cards */}
            <div className="space-y-4">
              {sortedFiltered.map((review) => {
                const rating = STAR_RATING_TO_NUMBER[review.starRating] ?? 0
                const reviewerName = review.reviewer?.isAnonymous ? 'Anonymous' : (review.reviewer?.displayName || 'Anonymous')
                const hasReply = !!review.reviewReply

                return (
                  <div
                    key={review.name}
                    className="bg-white rounded-2xl border border-[#4A3428]/6 shadow-sm overflow-hidden"
                    style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
                  >
                    {/* Review header */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-[#F5F5DC] border border-[#C9A961]/30 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-[#4A3428]">
                              {reviewerName[0]?.toUpperCase() ?? '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{reviewerName}</p>
                            <p className="text-xs text-gray-400">{formatDate(review.createTime)}</p>
                          </div>
                        </div>
                        <StarRating rating={rating} />
                      </div>

                      {/* Review text */}
                      {review.comment ? (
                        <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No written review.</p>
                      )}
                    </div>

                    {/* Existing reply */}
                    {hasReply && (
                      <div className="mx-5 mb-4 p-3.5 bg-[#F5F5DC]/40 border border-[#C9A961]/20 rounded-xl">
                        <p className="text-xs font-semibold text-[#4A3428] mb-1">Your reply</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{review.reviewReply!.comment}</p>
                        <p className="text-xs text-gray-400 mt-1.5">{formatDate(review.reviewReply!.updateTime)}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="px-5 pb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => openReplyModal(review)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        {hasReply ? 'Edit Reply' : 'Reply'}
                      </button>
                      {!hasReply && (
                        <span className="text-xs text-amber-600 font-medium">Awaiting reply</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="pt-8 pb-4 text-center">
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Back to Overview
          </Link>
        </div>
      </div>

      {/* Reply modal */}
      {replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            {/* Gold accent top */}
            <div className="h-0.5 bg-gradient-to-r from-[#C9A961] via-[#e6c97a] to-[#C9A961]" />
            <div className="p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">
                {replyTarget.reviewReply ? 'Edit Reply' : 'Reply to Review'}
              </h2>

              {/* Original review (read-only) */}
              <div className="mb-4 p-3.5 bg-[#F5F5DC]/40 border border-[#C9A961]/20 rounded-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <StarRating rating={STAR_RATING_TO_NUMBER[replyTarget.starRating] ?? 0} />
                  <span className="text-xs font-semibold text-gray-700">
                    {replyTarget.reviewer?.isAnonymous ? 'Anonymous' : (replyTarget.reviewer?.displayName || 'Anonymous')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {replyTarget.comment || <em className="text-gray-400">No written review.</em>}
                </p>
              </div>

              {/* Reply textarea */}
              <div className="mb-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={5}
                  placeholder="Write your reply..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-[#C9A961]/50 focus:border-[#C9A961] outline-none transition-colors resize-none"
                />
                <p className={`text-xs mt-1 text-right ${replyText.length > 4096 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                  {replyText.length} / 4096
                </p>
              </div>

              {/* Error */}
              {replyError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-600">{replyError}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeReplyModal}
                  disabled={replyPosting}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePostReply}
                  disabled={replyPosting || !replyText.trim() || replyText.length > 4096}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#4A3428] text-white hover:bg-[#4A3428]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {replyPosting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Posting…
                    </>
                  ) : 'Post Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
