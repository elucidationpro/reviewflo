import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'

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
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    total: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  })
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    checkAuthAndFetchData()
  }, [])

  const checkAuthAndFetchData = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Fetch business data for the logged-in user
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, business_name, slug, primary_color')
        .eq('user_id', user.id)
        .single()

      if (businessError || !businessData) {
        console.error('Error fetching business:', businessError)
        setIsLoading(false)
        return
      }

      setBusiness(businessData)

      // Fetch reviews for this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('star_rating')
        .eq('business_id', businessData.id)
        .gte('created_at', startOfMonth.toISOString())

      if (!reviewsError && reviews) {
        const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        reviews.forEach((review) => {
          const rating = review.star_rating as 1 | 2 | 3 | 4 | 5
          if (rating >= 1 && rating <= 5) {
            breakdown[rating]++
          }
        })

        setReviewStats({
          total: reviews.length,
          breakdown
        })
      }

      // Fetch recent feedback
      const { data: feedback, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('business_id', businessData.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!feedbackError && feedback) {
        setFeedbackList(feedback)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setIsLoading(false)
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">No Business Found</h1>
          <p className="text-gray-600 mb-6">
            Your account is not associated with any business yet.
          </p>
          <button
            onClick={handleLogout}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ color: business.primary_color }}
              >
                {business.business_name}
              </h1>
              <p className="text-gray-600">Dashboard Overview</p>
            </div>
            <button
              onClick={handleLogout}
              className="mt-4 md:mt-0 bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Monthly Reviews Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Reviews This Month
            </h2>
            <div className="text-center mb-6">
              <div
                className="text-6xl font-bold mb-2"
                style={{ color: business.primary_color }}
              >
                {reviewStats.total}
              </div>
              <p className="text-gray-600">Total Reviews</p>
            </div>

            {/* Star Rating Breakdown */}
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center">
                  <div className="flex items-center w-20">
                    <span className="text-sm font-medium text-gray-700 mr-2">
                      {rating}
                    </span>
                    <svg
                      className="w-4 h-4"
                      fill={business.primary_color}
                      viewBox="0 0 24 24"
                    >
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: reviewStats.total > 0
                            ? `${(reviewStats.breakdown[rating as keyof typeof reviewStats.breakdown] / reviewStats.total) * 100}%`
                            : '0%',
                          backgroundColor: business.primary_color
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-sm font-semibold text-gray-700">
                      {reviewStats.breakdown[rating as keyof typeof reviewStats.breakdown]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Quick Stats
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                  <p className="text-2xl font-bold text-gray-800">
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

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Pending Feedback</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {feedbackList.filter(f => !f.is_resolved).length}
                  </p>
                </div>
                <svg
                  className="w-12 h-12 text-orange-500"
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

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Business Slug</p>
                  <p className="text-lg font-mono text-gray-800">
                    /{business.slug}
                  </p>
                </div>
                <svg
                  className="w-12 h-12 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Feedback */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">
            Recent Feedback
          </h2>

          {feedbackList.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No feedback received yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((feedback) => (
                <div
                  key={feedback.id}
                  className={`border rounded-lg p-6 transition-all ${
                    feedback.is_resolved
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            feedback.is_resolved
                              ? 'bg-green-200 text-green-800'
                              : 'bg-orange-200 text-orange-800'
                          }`}
                        >
                          {feedback.is_resolved ? 'Resolved' : 'Pending'}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-800 mb-1">
                          What happened:
                        </h3>
                        <p className="text-gray-700">{feedback.what_happened}</p>
                      </div>

                      <div className="mb-3">
                        <h3 className="font-semibold text-gray-800 mb-1">
                          How to make it right:
                        </h3>
                        <p className="text-gray-700">{feedback.how_to_make_right}</p>
                      </div>

                      {feedback.wants_contact && (
                        <div className="flex flex-wrap gap-3 text-sm">
                          {feedback.email && (
                            <div className="flex items-center text-gray-600">
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
                            <div className="flex items-center text-gray-600">
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
                        className="mt-4 md:mt-0 md:ml-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
        <p className="text-center text-gray-400 text-sm mt-8">
          Powered by ReviewFlow
        </p>
      </div>
    </div>
  )
}
