import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import { checkIsAdmin } from '../../lib/adminAuth'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import AdminLayout from '@/components/AdminLayout'

interface Business {
  id: string
  business_name: string
  owner_name?: string | null
  owner_email: string
  slug: string
  created_at: string
  reviews_count: number
  feedback_count: number
  user_id: string
  tier: 'free' | 'pro' | 'ai'
  admin_override?: boolean
}

interface Stats {
  total: number
  recentSignups: number
  interestedInPro: number
  interestedInAI: number
}

interface ChartData {
  tierDistribution: Array<{ name: string; value: number }>
  signupsOverTime: Array<{ date: string; count: number }>
  reviewsOverTime: Array<{ date: string; count: number }>
}

export default function AdminDashboard() {
  console.log('[Component] AdminDashboard component loaded and executing')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, recentSignups: 0, interestedInPro: 0, interestedInAI: 0 })
  const [chartData, setChartData] = useState<ChartData>({ tierDistribution: [], signupsOverTime: [], reviewsOverTime: [] })
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [updatingTierId, setUpdatingTierId] = useState<string | null>(null)

  useEffect(() => {
    console.log('[Component] AdminDashboard useEffect is running')
    checkAdminAndFetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Filter businesses based on search query
    if (searchQuery.trim() === '') {
      setFilteredBusinesses(businesses)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = businesses.filter(
        (b) =>
          b.business_name.toLowerCase().includes(query) ||
          b.owner_email.toLowerCase().includes(query) ||
          (b.owner_name && b.owner_name.toLowerCase().includes(query))
      )
      setFilteredBusinesses(filtered)
    }
  }, [searchQuery, businesses])

  const checkAdminAndFetchData = async () => {
    console.time('[Admin] Total Load Time')
    console.log('[Admin] Starting checkAdminAndFetchData')
    try {
      // Check if user is admin
      console.time('[Admin] Auth Check')
      const adminUser = await checkIsAdmin()
      console.timeEnd('[Admin] Auth Check')
      console.log('[Admin] checkIsAdmin result:', adminUser)

      if (!adminUser) {
        console.log('[Admin] Not admin, redirecting to /login')
        router.push('/login?redirect=/admin')
        return
      }

      // Get access token
      console.time('[Admin] Session Fetch')
      const { data: { session } } = await supabase.auth.getSession()
      console.timeEnd('[Admin] Session Fetch')
      console.log('[Admin] Session result:', session ? 'Session found' : 'No session')

      if (!session) {
        console.log('[Admin] No session, redirecting to /login')
        router.push('/login?redirect=/admin')
        return
      }

      // Fetch businesses data
      console.time('[Admin] API Fetch Businesses')
      const response = await fetch('/api/admin/get-businesses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      console.timeEnd('[Admin] API Fetch Businesses')

      console.log('[Admin] API response status:', response.status, response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[Admin] API error response:', errorData)
        throw new Error(errorData.error || 'Failed to fetch businesses')
      }

      const data = await response.json()
      console.log('[Admin] API data received:', {
        businessCount: data.businesses?.length,
        stats: data.stats
      })

      setBusinesses(data.businesses || [])
      setFilteredBusinesses(data.businesses || [])
      setStats(data.stats || { total: 0, recentSignups: 0, interestedInPro: 0, interestedInAI: 0 })
      setChartData(data.charts || { tierDistribution: [], signupsOverTime: [], reviewsOverTime: [] })

      console.log('[Admin] Setting isLoading to false - SUCCESS')
      setIsLoading(false)
      console.timeEnd('[Admin] Total Load Time')
    } catch (err) {
      console.error('[Admin] Caught error in checkAdminAndFetchData:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load admin dashboard'
      setError(errorMessage)
      console.log('[Admin] Setting isLoading to false - ERROR')
      setIsLoading(false)
      console.timeEnd('[Admin] Total Load Time')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleOverrideTier = async (businessId: string, newTier: 'free' | 'pro' | 'ai') => {
    setUpdatingTierId(businessId)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired. Please refresh.')
        setUpdatingTierId(null)
        return
      }
      const response = await fetch('/api/admin/override-tier', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ business_id: businessId, new_tier: newTier }),
      })
      const data = await response.json()
      if (response.ok) {
        setBusinesses(prev =>
          prev.map(b => (b.id === businessId ? { ...b, tier: newTier, admin_override: true } : b))
        )
        setFilteredBusinesses(prev =>
          prev.map(b => (b.id === businessId ? { ...b, tier: newTier, admin_override: true } : b))
        )
        setSuccessMessage(`Tier set to ${newTier.toUpperCase()} for testing`)
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to update tier')
      }
    } catch (err) {
      console.error('Error overriding tier:', err)
      setError('Failed to update tier')
    } finally {
      setUpdatingTierId(null)
    }
  }

  const handleDeleteBusiness = async (businessId: string, businessName: string) => {
    if (!confirm(`Are you sure you want to delete "${businessName}"? This cannot be undone.`)) {
      return
    }

    setError('')
    setSuccessMessage('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired. Please refresh the page.')
        return
      }

      const response = await fetch('/api/admin/delete-business', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccessMessage(`"${businessName}" has been deleted successfully`)
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000)
        // Refresh businesses data
        checkAdminAndFetchData()
      } else {
        setError(data.error || 'Failed to delete business')
        // Auto-hide error message after 5 seconds
        setTimeout(() => setError(''), 5000)
      }
    } catch (error) {
      console.error('Error deleting business:', error)
      setError('An error occurred while deleting the business')
      setTimeout(() => setError(''), 5000)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout onLogout={handleLogout}>
      <div className="px-4 py-8 max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 animate-pulse">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="h-10 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                <div className="h-12 bg-gray-200 rounded-lg w-32"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-40"></div>
                <div className="h-12 bg-gray-200 rounded-lg w-24"></div>
              </div>
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </AdminLayout>
    )
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AdminLayout onLogout={handleLogout}>
        <div className="px-4 py-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Overview</h1>
            <p className="text-gray-600 mt-1">Stats, activity, and all businesses</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-green-600 mt-0.5 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-green-800 text-sm font-medium">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-red-600 mt-0.5 mr-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Businesses</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-[#4A3428]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#4A3428]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Recent Signups (7d)</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.recentSignups}</p>
                </div>
                <div className="w-12 h-12 bg-[#4A3428]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#4A3428]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {businesses.reduce((sum, b) => sum + b.reviews_count, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#C9A961]/20 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#4A3428]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="p-4 bg-[#C9A961]/10 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Tier Demand</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 uppercase">Pro</span>
                    <span className="text-lg font-bold text-gray-900">{stats.interestedInPro}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 uppercase">AI</span>
                    <span className="text-lg font-bold text-gray-900">{stats.interestedInAI}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Users waiting for launch</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="space-y-6 mb-8">
            {/* Activity Over Time - Full Width */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity (Last 30 Days)</h3>
              {(chartData.signupsOverTime.length > 0 || chartData.reviewsOverTime.length > 0) ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={(() => {
                    // Merge signups and reviews data by date
                    const mergedData: { [key: string]: { date: string; signups: number; reviews: number } } = {}

                    chartData.signupsOverTime.forEach(item => {
                      mergedData[item.date] = { date: item.date, signups: item.count, reviews: 0 }
                    })

                    chartData.reviewsOverTime.forEach(item => {
                      if (mergedData[item.date]) {
                        mergedData[item.date].reviews = item.count
                      } else {
                        mergedData[item.date] = { date: item.date, signups: 0, reviews: item.count }
                      }
                    })

                    return Object.values(mergedData).sort((a, b) => a.date.localeCompare(b.date))
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value)
                        return `${date.getMonth() + 1}/${date.getDate()}`
                      }}
                    />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                      labelFormatter={(value) => {
                        const date = new Date(value)
                        return date.toLocaleDateString()
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="signups"
                      name="New Signups"
                      stroke="#4A3428"
                      strokeWidth={2}
                      dot={{ fill: '#4A3428', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="reviews"
                      name="Reviews Submitted"
                      stroke="#C9A961"
                      strokeWidth={2}
                      dot={{ fill: '#C9A961', r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px]">
                  <p className="text-gray-500">No activity data available</p>
                </div>
              )}
            </div>

            {/* Tier Distribution */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tier Distribution</h3>
              {chartData.tierDistribution.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.tierDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) =>
                        value > 0 && percent ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                      }
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.tierDistribution.map((entry, index) => {
                        const colors = ['#4A3428', '#C9A961', '#F5F5DC']
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-gray-500">No tier data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <a
            href="https://usereviewflo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-8 transition-opacity hover:opacity-70"
          >
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <span>Powered by</span>
              <div className="relative w-24 h-6">
                <Image
                  src="/images/reviewflo-logo.svg"
                  alt="ReviewFlo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </a>
        </div>
      </AdminLayout>
    </>
  )
}
