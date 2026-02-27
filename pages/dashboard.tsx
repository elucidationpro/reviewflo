import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { trackEvent, identifyUser } from '../lib/posthog-provider'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
}

interface ReviewStats {
  total: number
  breakdown: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

interface Feedback {
  id: string
  what_happened: string
  how_to_make_right: string
  wants_contact: boolean
  email: string | null
  phone: string | null
  is_resolved: boolean
  created_at: string
}

export default function DashboardPage() {
  console.log('[Component] DashboardPage component loaded and executing')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    total: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  })
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    console.log('[Component] DashboardPage useEffect is running')
    checkAuthAndFetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuthAndFetchData = async () => {
    console.time('[Dashboard] Total Load Time')
    console.log('[Dashboard] Starting checkAuthAndFetchData')
    try {
      // Check if user is authenticated
      console.time('[Dashboard] Auth Check')
      const { data: { user } } = await supabase.auth.getUser()
      console.timeEnd('[Dashboard] Auth Check')
      console.log('[Dashboard] User check result:', user)

      if (!user) {
        console.log('[Dashboard] No user found, redirecting to /login')
        router.push('/login')
        return
      }

      // Fetch business data for the logged-in user
      console.time('[Dashboard] Business Fetch')
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, business_name, slug, primary_color')
        .eq('user_id', user.id)
        .single()
      console.timeEnd('[Dashboard] Business Fetch')

      if (businessError || !businessData) {
        console.log('[Dashboard] No business found, setting isLoading to false')
        console.error('Error fetching business:', businessError)
        setIsLoading(false)
        console.timeEnd('[Dashboard] Total Load Time')
        return
      }

      console.log('[Dashboard] Business found:', businessData.business_name)
      setBusiness(businessData)

      // EVENT 2: Track business onboarding (first time dashboard load)
      // Identify the business owner in PostHog
      identifyUser(user.id, {
        businessId: businessData.id,
        businessName: businessData.business_name,
        businessSlug: businessData.slug,
      })

      // Track the dashboard access as a proxy for successful onboarding
      trackEvent('business_onboarded', {
        businessId: businessData.id,
        businessName: businessData.business_name,
        onboardingDate: new Date().toISOString(),
      })

      // Parallelize reviews and feedback fetching
      console.time('[Dashboard] Parallel Data Fetch')
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [reviewsResult, feedbackResult] = await Promise.all([
        supabase
          .from('reviews')
          .select('star_rating')
          .eq('business_id', businessData.id)
          .gte('created_at', startOfMonth.toISOString()),
        supabase
          .from('feedback')
          .select('*')
          .eq('business_id', businessData.id)
          .order('created_at', { ascending: false })
          .limit(50) // Limit to last 50 feedback items for better performance
      ])
      console.timeEnd('[Dashboard] Parallel Data Fetch')

      // Process reviews
      if (!reviewsResult.error && reviewsResult.data) {
        console.log('[Dashboard] Reviews loaded:', reviewsResult.data.length)
        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        reviewsResult.data.forEach((review) => {
          const rating = review.star_rating as 1 | 2 | 3 | 4 | 5
          if (rating >= 1 && rating <= 5) {
            breakdown[rating]++
          }
        })

        setReviewStats({
          total: reviewsResult.data.length,
          breakdown
        })
      } else if (reviewsResult.error) {
        console.error('[Dashboard] Reviews fetch error:', reviewsResult.error)
        // Don't block page load, just show empty stats
      }

      // Process feedback
      if (!feedbackResult.error && feedbackResult.data) {
        console.log('[Dashboard] Feedback loaded:', feedbackResult.data.length)
        setFeedbackList(feedbackResult.data)
      } else if (feedbackResult.error) {
        console.error('[Dashboard] Feedback fetch error:', feedbackResult.error)
        // Don't block page load, just show empty feedback
      }

      console.log('[Dashboard] Setting isLoading to false - SUCCESS')
      setIsLoading(false)
      console.timeEnd('[Dashboard] Total Load Time')
    } catch (error) {
      console.error('[Dashboard] Caught error in checkAuthAndFetchData:', error)
      console.log('[Dashboard] Setting isLoading to false - ERROR')
      setIsLoading(false)
      console.timeEnd('[Dashboard] Total Load Time')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleResolveFeedback = async (feedbackId: string) => {
    setResolvingId(feedbackId)

    const { error } = await supabase
      .from('feedback')
      .update({ is_resolved: true })
      .eq('id', feedbackId)

    if (!error) {
      setFeedbackList(feedbackList.map(f =>
        f.id === feedbackId ? { ...f, is_resolved: true } : f
      ))
    }

    setResolvingId(null)
  }

  const baseHost = 'usereviewflo.com'
  const fullUrlForCopy = `https://${baseHost}/${business?.slug || ''}`

  const displayLink = `${baseHost}/${business?.slug || ''}`

  const handleCopyReviewLink = async () => {
    if (!fullUrlForCopy || fullUrlForCopy.endsWith('/')) return
    try {
      await navigator.clipboard.writeText(fullUrlForCopy)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = fullUrlForCopy
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2500)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 mb-8 animate-pulse">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="h-10 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                <div className="h-12 bg-gray-200 rounded-lg w-24"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-24"></div>
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="text-center mb-6">
                <div className="h-20 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback Skeleton */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-6">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12 max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">No Business Found</h1>
          <p className="text-slate-600 mb-6">
            Your account is not associated with any business yet.
          </p>
          <button
            onClick={handleLogout}
            className="bg-slate-700 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ color: business.primary_color || '#1e293b' }}
              >
                {business.business_name}
              </h1>
              <p className="text-slate-600">Dashboard Overview</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Link
                href="/settings"
                className="bg-slate-700 hover:bg-slate-800 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Your Review Link - Primary CTA for first-time users */}
        <div
          className="mb-8 rounded-xl border-2 p-6 md:p-8 shadow-lg"
          style={{
            backgroundColor: 'white',
            borderColor: business.primary_color || '#6366f1',
            borderLeftWidth: '6px',
          }}
        >
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Your Review Link</h2>
          <p className="text-slate-600 text-sm mb-4">
            Send this link to customers after each job. They rate their experience, then get guided to leave a Google review.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
              <a
                href={fullUrlForCopy}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm md:text-base font-mono text-slate-800 truncate hover:underline flex-1 min-w-0"
              >
                {displayLink}
              </a>
            </div>
            <button
              onClick={handleCopyReviewLink}
              className="shrink-0 flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-lg transition-colors"
              style={{
                backgroundColor: business.primary_color || '#6366f1',
                color: 'white',
              }}
            >
              {linkCopied ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
          </div>
          {(reviewStats.total === 0 && feedbackList.length === 0) && (
            <p className="text-sm text-slate-500 mt-4">
              💡 Try it first: send the link to yourself and rate your own &quot;service&quot; to see how it works.
            </p>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Monthly Reviews Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              Reviews This Month
            </h2>
            <div className="text-center mb-6">
              <div
                className="text-6xl font-bold mb-2"
                style={{ color: business.primary_color || '#1e293b' }}
              >
                {reviewStats.total}
              </div>
              <p className="text-slate-600">Total Reviews</p>
            </div>

            {/* Star Rating Breakdown */}
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center">
                  <div className="flex items-center w-20">
                    <span className="text-sm font-medium text-slate-800 mr-2">
                      {rating}
                    </span>
                    <svg
                      className="w-4 h-4"
                      fill={business.primary_color || '#6366f1'}
                      viewBox="0 0 24 24"
                    >
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: reviewStats.total > 0
                            ? `${(reviewStats.breakdown[rating as keyof typeof reviewStats.breakdown] / reviewStats.total) * 100}%`
                            : '0%',
                          backgroundColor: business.primary_color || '#6366f1'
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-sm font-semibold text-slate-800">
                      {reviewStats.breakdown[rating as keyof typeof reviewStats.breakdown]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats Card */}
          {/* TODO: When review request sending is implemented, add EVENT 3 tracking here:
              trackEvent('review_request_sent', {
                businessId: business.id,
                customerId: customer.id,
                requestMethod: 'sms' | 'email'
              })
          */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              Quick Stats
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Average Rating</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {reviewStats.total > 0
                      ? (
                          (reviewStats.breakdown[5] * 5 +
                            reviewStats.breakdown[4] * 4 +
                            reviewStats.breakdown[3] * 3 +
                            reviewStats.breakdown[2] * 2 +
                            reviewStats.breakdown[1] * 1) /
                          reviewStats.total
                        ).toFixed(1)
                      : '0.0'}
                  </p>
                </div>
                <svg
                  className="w-12 h-12"
                  fill={business.primary_color}
                  viewBox="0 0 24 24"
                >
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Pending Feedback</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {feedbackList.filter(f => !f.is_resolved).length}
                  </p>
                </div>
                <svg
                  className="w-12 h-12 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            Recent Feedback
          </h2>

          {feedbackList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No feedback received yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((feedback) => (
                <div
                  key={feedback.id}
                  className={`border rounded-lg p-6 transition-all ${
                    feedback.is_resolved
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            feedback.is_resolved
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {feedback.is_resolved ? 'Resolved' : 'Pending'}
                        </span>
                        <span className="text-sm text-slate-500">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mb-3">
                        <h3 className="font-semibold text-slate-800 mb-1">
                          What happened:
                        </h3>
                        <p className="text-slate-800/90">{feedback.what_happened}</p>
                      </div>

                      <div className="mb-3">
                        <h3 className="font-semibold text-slate-800 mb-1">
                          How to make it right:
                        </h3>
                        <p className="text-slate-800/90">{feedback.how_to_make_right}</p>
                      </div>

                      {feedback.wants_contact && (
                        <div className="flex flex-wrap gap-3 text-sm">
                          {feedback.email && (
                            <div className="flex items-center text-slate-600">
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                              </svg>
                              {feedback.email}
                            </div>
                          )}
                          {feedback.phone && (
                            <div className="flex items-center text-slate-600">
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                              </svg>
                              {feedback.phone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!feedback.is_resolved && (
                      <button
                        onClick={() => handleResolveFeedback(feedback.id)}
                        disabled={resolvingId === feedback.id}
                        className="mt-4 md:mt-0 md:ml-4 bg-slate-700 hover:bg-slate-800 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {resolvingId === feedback.id ? 'Resolving...' : 'Mark Resolved'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-800/60 text-sm mt-8">
          Powered by ReviewFlo
        </p>
      </div>
    </div>
  )
}

