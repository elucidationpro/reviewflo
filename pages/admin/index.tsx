import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import { checkIsAdmin } from '../../lib/adminAuth'

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

interface EarlyAccessSignup {
  id: string
  user_id: string
  email: string
  full_name: string | null
  business_type: string | null
  customers_per_month: string | null
  review_asking_frequency: string | null
  stripe_session_id: string | null
  business_id: string | null
  access_start_date: string | null
  access_end_date: string | null
  created_at: string
  updated_at: string
}

interface Stats {
  total: number
  recentSignups: number
  interestedInPro: number
  interestedInAI: number
}

export default function AdminDashboard() {
  console.log('[Component] AdminDashboard component loaded and executing')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [betaSignups, setBetaSignups] = useState<BetaSignup[]>([])
  const [waitlistSignups, setWaitlistSignups] = useState<WaitlistSignup[]>([])
  const [earlyAccessSignups, setEarlyAccessSignups] = useState<EarlyAccessSignup[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, recentSignups: 0, interestedInPro: 0, interestedInAI: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [deletingEarlyAccessId, setDeletingEarlyAccessId] = useState<string | null>(null)
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

      // Fetch early access signups
      const earlyRes = await fetch('/api/admin/get-early-access', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (earlyRes.ok) {
        const earlyData = await earlyRes.json()
        setEarlyAccessSignups(earlyData.earlyAccessSignups || [])
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

  const handleDeleteEarlyAccessSignup = async (signupId: string) => {
    if (!confirm('Remove this early access signup? This cannot be undone.')) return

    setDeletingEarlyAccessId(signupId)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired. Please refresh.')
        setDeletingEarlyAccessId(null)
        return
      }

      const response = await fetch('/api/admin/delete-early-access-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: signupId }),
      })

      if (response.ok) {
        setEarlyAccessSignups(prev => prev.filter(s => s.id !== signupId))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to remove')
      }
    } catch (err) {
      console.error('Error deleting early access signup:', err)
      setError('Failed to remove')
    } finally {
      setDeletingEarlyAccessId(null)
    }
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
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC]/30 via-white to-[#F5F5DC]/30 px-4 py-8">
        <div className="max-w-7xl mx-auto">
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

          {/* Search Bar Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
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
      <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC]/30 via-white to-[#F5F5DC]/30 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Admin Dashboard</h1>
                  <span className="bg-[#4A3428] text-white text-xs font-bold px-3 py-1 rounded-full">
                    ADMIN
                  </span>
                </div>
                <p className="text-gray-600">Manage all ReviewFlo businesses</p>
              </div>
              <div className="flex gap-3 mt-4 md:mt-0">
                <Link
                  href="/admin/create-business"
                  className="bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Create New Business
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
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

          {/* Early Access Signups */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-4">
              Early Access ({earlyAccessSignups.length})
            </h2>
            {earlyAccessSignups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Business type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Paid</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">Signed up</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {earlyAccessSignups.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          <a href={`mailto:${row.email}`} className="text-gray-900 hover:text-[#4A3428] hover:underline">{row.email}</a>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{row.full_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{row.business_type || '—'}</td>
                        <td className="px-4 py-3">
                          {row.stripe_session_id ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Yes</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(row.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {row.business_id ? (
                              <Link
                                href={`/admin/businesses/${row.business_id}`}
                                className="inline-flex items-center px-3 py-1.5 text-sm bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-medium rounded transition-colors"
                              >
                                View
                              </Link>
                            ) : row.stripe_session_id ? (
                              <Link
                                href={{
                                  pathname: '/admin/create-business',
                                  query: {
                                    earlyAccessSignupId: row.id,
                                    name: row.full_name || '',
                                    email: row.email,
                                    businessType: row.business_type || '',
                                  },
                                }}
                                className="inline-flex items-center px-3 py-1.5 text-sm bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-medium rounded transition-colors"
                              >
                                Create account
                              </Link>
                            ) : (
                              <span className="text-xs text-gray-400">Paid required</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteEarlyAccessSignup(row.id)}
                              disabled={deletingEarlyAccessId === row.id}
                              className="inline-flex items-center px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50"
                            >
                              {deletingEarlyAccessId === row.id ? 'Removing…' : 'Remove'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No early access signups yet.</p>
            )}
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-4">ReviewFlo Admin Panel</h2>
            <input
              type="text"
              placeholder="Search businesses by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
            />
          </div>

          {/* Businesses Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Business Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Owner Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Reviews
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Feedback
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBusinesses.map((business) => (
                    <tr key={business.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{business.business_name}</p>
                          <p className="text-sm text-gray-500">/{business.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div>
                          {business.owner_name && <p className="font-medium text-gray-900">{business.owner_name}</p>}
                          <a href={`mailto:${business.owner_email}`} className="text-gray-600 hover:underline">{business.owner_email}</a>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={business.tier || 'free'}
                          onChange={(e) => handleOverrideTier(business.id, e.target.value as 'free' | 'pro' | 'ai')}
                          disabled={updatingTierId === business.id}
                          className="text-sm font-medium px-2 py-1.5 rounded border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-[#C9A961] disabled:opacity-50"
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro (testing)</option>
                          <option value="ai">AI (testing)</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(business.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                          {business.reviews_count}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                          {business.feedback_count}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/businesses/${business.id}`}
                            className="px-3 py-1 text-sm bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-medium rounded transition-colors"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/${business.slug}`}
                            target="_blank"
                            className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-800 text-white font-medium rounded transition-colors"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDeleteBusiness(business.id, business.business_name)}
                            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors"
                          >
                            Delete
                          </button>
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
      </div>
    </>
  )
}
