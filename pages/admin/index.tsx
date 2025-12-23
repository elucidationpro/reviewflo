import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { checkIsAdmin } from '../../lib/adminAuth'

interface Business {
  id: string
  business_name: string
  owner_email: string
  slug: string
  created_at: string
  reviews_count: number
  feedback_count: number
  user_id: string
}

interface BetaSignup {
  id: string
  name: string
  email: string
  phone: string
  business_name: string
  business_type: string
  challenge: string | null
  created_at: string
}

interface WaitlistSignup {
  id: string
  email: string
  business_name: string
  business_type: string
  created_at: string
}

interface Stats {
  total: number
  recentSignups: number
}

export default function AdminDashboard() {
  console.log('[Component] AdminDashboard component loaded and executing')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [betaSignups, setBetaSignups] = useState<BetaSignup[]>([])
  const [waitlistSignups, setWaitlistSignups] = useState<WaitlistSignup[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, recentSignups: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

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
          b.owner_email.toLowerCase().includes(query)
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
      setStats(data.stats || { total: 0, recentSignups: 0 })

      // Fetch beta signups via API (uses service role)
      console.time('[Admin] API Fetch Beta Signups')
      const betaResponse = await fetch('/api/admin/get-beta-signups', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      console.timeEnd('[Admin] API Fetch Beta Signups')

      if (betaResponse.ok) {
        const betaData = await betaResponse.json()
        console.log('[Admin] Beta signups received:', betaData.betaSignups?.length || 0)
        setBetaSignups(betaData.betaSignups || [])
      } else {
        console.error('[Admin] Failed to fetch beta signups:', betaResponse.status)
      }

      // Fetch waitlist signups via API (uses service role)
      console.time('[Admin] API Fetch Waitlist Signups')
      const waitlistResponse = await fetch('/api/admin/get-waitlist-signups', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })
      console.timeEnd('[Admin] API Fetch Waitlist Signups')

      if (waitlistResponse.ok) {
        const waitlistData = await waitlistResponse.json()
        console.log('[Admin] Waitlist signups received:', waitlistData.waitlistSignups?.length || 0)
        setWaitlistSignups(waitlistData.waitlistSignups || [])
      } else {
        console.error('[Admin] Failed to fetch waitlist signups:', waitlistResponse.status)
      }

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 animate-pulse">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-xl p-6 md:p-8 animate-pulse">
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

          {/* Search Bar Skeleton */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden animate-pulse">
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-12 bg-gray-200 rounded flex-1"></div>
                    <div className="h-12 bg-gray-200 rounded w-32"></div>
                    <div className="h-12 bg-gray-200 rounded w-24"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard - ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-red-600">Admin Dashboard</h1>
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ADMIN
                  </span>
                </div>
                <p className="text-gray-600">Manage all ReviewFlo businesses</p>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                <Link
                  href="/admin/invite-codes"
                  className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Invite Codes
                </Link>
                <Link
                  href="/admin/create-business"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Create New Business
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Businesses</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Recent Signups (7 days)</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.recentSignups}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {businesses.reduce((sum, b) => sum + b.reviews_count, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Beta Signups Section */}
          {betaSignups.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Beta Signups ({betaSignups.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {betaSignups.map((signup) => (
                      <tr key={signup.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{signup.name}</p>
                            {signup.challenge && (
                              <p className="text-xs text-gray-500 mt-1 truncate max-w-xs" title={signup.challenge}>
                                Challenge: {signup.challenge}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900">{signup.business_name}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {signup.business_type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <p className="text-gray-900">{signup.email}</p>
                            <p className="text-gray-500">{signup.phone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {new Date(signup.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end">
                            <Link
                              href={{
                                pathname: '/admin/create-business',
                                query: {
                                  betaSignupId: signup.id,
                                  name: signup.name,
                                  email: signup.email,
                                  phone: signup.phone,
                                  businessName: signup.business_name,
                                  businessType: signup.business_type
                                }
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded transition-colors"
                            >
                              Create Account
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Waitlist Signups Section */}
          {waitlistSignups.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                Waitlist Signups ({waitlistSignups.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Business Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {waitlistSignups.map((signup) => (
                      <tr key={signup.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <a href={`mailto:${signup.email}`} className="text-blue-600 hover:underline">
                            {signup.email}
                          </a>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900">{signup.business_name}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {signup.business_type}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {new Date(signup.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <a
                              href={`mailto:${signup.email}?subject=ReviewFlo%20Beta%20Invitation&body=Hi!%0A%0AI'd%20love%20to%20invite%20you%20to%20join%20the%20ReviewFlo%20beta%20program...`}
                              className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
                            >
                              Invite to Beta
                            </a>
                            <a
                              href={`mailto:${signup.email}`}
                              className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-700 text-white font-medium rounded transition-colors"
                            >
                              Email
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Search Businesses</h2>
            <input
              type="text"
              placeholder="Search businesses by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Businesses Table */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Business Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Owner Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Reviews
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Feedback
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBusinesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{business.business_name}</p>
                          <p className="text-sm text-gray-500">/{business.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {business.owner_email}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(business.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                          {business.reviews_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-600 rounded-full text-sm font-semibold">
                          {business.feedback_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/businesses/${business.id}`}
                            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/${business.slug}`}
                            target="_blank"
                            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white font-medium rounded transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredBusinesses.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {searchQuery ? 'No businesses found matching your search.' : 'No businesses yet.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-sm mt-8">
            Powered by ReviewFlo
          </p>
        </div>
      </div>
    </>
  )
}
