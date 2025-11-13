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
    console.log('[Admin] Starting checkAdminAndFetchData')
    try {
      // Check if user is admin
      console.log('[Admin] Checking if user is admin...')
      const adminUser = await checkIsAdmin()
      console.log('[Admin] checkIsAdmin result:', adminUser)

      if (!adminUser) {
        console.log('[Admin] Not admin, redirecting to /login')
        router.push('/login')
        return
      }

      // Get access token
      console.log('[Admin] Getting session...')
      const { data: { session } } = await supabase.auth.getSession()
      console.log('[Admin] Session result:', session ? 'Session found' : 'No session')

      if (!session) {
        console.log('[Admin] No session, redirecting to /login')
        router.push('/login')
        return
      }

      // Fetch businesses data
      console.log('[Admin] Fetching businesses from API...')
      const response = await fetch('/api/admin/get-businesses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      console.log('[Admin] API response status:', response.status, response.ok)

      if (!response.ok) {
        throw new Error('Failed to fetch businesses')
      }

      const data = await response.json()
      console.log('[Admin] API data received:', {
        businessCount: data.businesses?.length,
        stats: data.stats
      })

      setBusinesses(data.businesses)
      setFilteredBusinesses(data.businesses)
      setStats(data.stats)

      console.log('[Admin] Setting isLoading to false - SUCCESS')
      setIsLoading(false)
    } catch (err) {
      console.error('[Admin] Caught error in checkAdminAndFetchData:', err)
      setError('Failed to load admin dashboard')
      console.log('[Admin] Setting isLoading to false - ERROR')
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading admin dashboard...</p>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Admin Dashboard</h1>
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    ADMIN
                  </span>
                </div>
                <p className="text-gray-600 mt-2">Manage all ReviewFlo businesses</p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/admin/invite-codes"
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Invite Codes
                </Link>
                <Link
                  href="/admin/create-business"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Create New Business
                </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Businesses</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Recent Signups (7 days)</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.recentSignups}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Reviews</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {businesses.reduce((sum, b) => sum + b.reviews_count, 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <input
              type="text"
              placeholder="Search businesses by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>

          {/* Businesses Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
        </div>
      </div>
    </>
  )
}
