import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../lib/posthog-provider'
import AppLayout from '@/components/AppLayout'
import { useBusiness } from '@/contexts/BusinessContext'
import type { FeedbackInboxItem } from './api/feedback-inbox'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
  tier: 'free' | 'pro' | 'ai'
}

export default function FeedbackPage() {
  const router = useRouter()
  const { selectedBusinessId } = useBusiness()
  const [isLoading, setIsLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [feedbackList, setFeedbackList] = useState<FeedbackInboxItem[]>([])
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndFetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  const checkAuthAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/login')
        return
      }

      const bizUrl = selectedBusinessId
        ? `/api/my-business?businessId=${encodeURIComponent(selectedBusinessId)}`
        : '/api/my-business'
      const res = await fetch(bizUrl, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })

      if (res.status === 401) {
        router.push('/login')
        return
      }

      const data = await res.json().catch(() => ({} as Record<string, unknown>))

      if (!res.ok || !data.business) {
        setIsLoading(false)
        return
      }

      const businessData = data.business as Business
      setBusiness(businessData)

      trackEvent('feedback_page_viewed', { businessId: businessData.id })

      const inboxRes = await fetch(
        `/api/feedback-inbox?businessId=${encodeURIComponent(businessData.id)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      if (inboxRes.ok) {
        const inboxData = await inboxRes.json() as { items: FeedbackInboxItem[] }
        setFeedbackList(inboxData.items)
      }

      setIsLoading(false)
    } catch {
      setIsLoading(false)
    }
  }

  const handleResolve = useCallback(async (item: FeedbackInboxItem) => {
    setResolvingId(item.key)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setResolvingId(null); return }

    const res = await fetch('/api/feedback-inbox-resolve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        feedbackId: item.feedbackId,
        reviewId: item.reviewId,
        businessId: business?.id,
      }),
    })

    if (res.ok) {
      setFeedbackList(prev =>
        prev.map(f => f.key === item.key ? { ...f, isResolved: true } : f)
      )
    }
    setResolvingId(null)
  }, [business])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4A3428]" />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-gray-500">Unable to load business data.</p>
      </div>
    )
  }

  const pendingCount = feedbackList.filter(f => !f.isResolved).length

  return (
    <AppLayout
      businessName={business.business_name}
      tier={business.tier}
      pendingFeedbackCount={pendingCount}
      onLogout={handleLogout}
    >
      <Head>
        <title>Feedback — ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
          <p className="text-sm text-gray-500 mt-1">Private feedback and follow-up answers from customers who rated your review page.</p>
        </div>

        {feedbackList.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">No responses yet — customer follow-up answers and private feedback show up here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((item) => (
              <div
                key={item.key}
                className={`rounded-xl border p-4 transition-colors ${
                  item.isResolved
                    ? 'border-emerald-100 bg-emerald-50/50'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                {/* Top row: status + stars + timestamp + resolve */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        item.isResolved
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {item.isResolved ? 'Resolved' : 'Pending'}
                    </span>
                    <span className="text-xs text-yellow-500 tracking-tighter" aria-label={`${item.starRating} stars`}>
                      {(() => { const s = Math.min(5, Math.max(0, item.starRating)); return '★'.repeat(s) + '☆'.repeat(5 - s) })()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                  {!item.isResolved && (
                    <button
                      onClick={() => handleResolve(item)}
                      disabled={resolvingId === item.key}
                      className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-[#4A3428] text-white rounded-lg hover:bg-[#4A3428]/90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {resolvingId === item.key ? 'Saving…' : 'Mark Resolved'}
                    </button>
                  )}
                </div>

                {/* Follow-up answer (if present) */}
                {item.followupAnswer && (
                  <div className="mb-3 space-y-1 text-sm">
                    <p className="text-xs font-semibold text-gray-500">Follow-up answer</p>
                    <p className="text-gray-800">{item.followupAnswer}</p>
                  </div>
                )}

                {/* Private feedback (if present) */}
                {item.whatHappened && (
                  <div className={`space-y-2 text-sm ${item.followupAnswer ? 'pt-3 border-t border-gray-100' : ''}`}>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-0.5">What happened</p>
                      <p className="text-gray-800">{item.whatHappened}</p>
                    </div>
                    {item.howToMakeRight && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-0.5">How to make it right</p>
                        <p className="text-gray-800">{item.howToMakeRight}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact info */}
                {item.wantsContact && (item.email || item.phone) && (
                  <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
                    {item.email && (
                      <a href={`mailto:${item.email}`} className="flex items-center gap-1.5 text-xs text-[#4A3428] hover:underline">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {item.email}
                      </a>
                    )}
                    {item.phone && (
                      <a href={`tel:${item.phone}`} className="flex items-center gap-1.5 text-xs text-[#4A3428] hover:underline">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {item.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
