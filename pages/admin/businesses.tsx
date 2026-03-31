import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import { checkIsAdmin } from '../../lib/adminAuth'
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

export default function AdminBusinessesPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [updatingTierId, setUpdatingTierId] = useState<string | null>(null)

  useEffect(() => {
    checkAdminAndFetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBusinesses(businesses)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = businesses.filter(
      (b) =>
        b.business_name.toLowerCase().includes(query) ||
        b.owner_email.toLowerCase().includes(query) ||
        (b.owner_name && b.owner_name.toLowerCase().includes(query))
    )
    setFilteredBusinesses(filtered)
  }, [searchQuery, businesses])

  const checkAdminAndFetchData = async () => {
    console.time('[Admin] Businesses page load')
    try {
      const adminUser = await checkIsAdmin()
      if (!adminUser) {
        router.push('/login?redirect=/admin/businesses')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login?redirect=/admin/businesses')
        return
      }

      const response = await fetch('/api/admin/get-businesses', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch businesses')
      }

      const data = await response.json()
      setBusinesses(data.businesses || [])
      setFilteredBusinesses(data.businesses || [])
      setIsLoading(false)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load businesses')
      setIsLoading(false)
    } finally {
      console.timeEnd('[Admin] Businesses page load')
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

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to update tier')

      setBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, tier: newTier, admin_override: true } : b)))
      setFilteredBusinesses((prev) => prev.map((b) => (b.id === businessId ? { ...b, tier: newTier, admin_override: true } : b)))
      setSuccessMessage(`Tier set to ${newTier.toUpperCase()} for testing`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Error overriding tier:', err)
      setError('Failed to update tier')
    } finally {
      setUpdatingTierId(null)
    }
  }

  const handleDeleteBusiness = async (businessId: string, businessName: string) => {
    if (!confirm(`Are you sure you want to delete "${businessName}"? This cannot be undone.`)) return

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
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to delete business')

      setSuccessMessage(`"${businessName}" has been deleted successfully`)
      setTimeout(() => setSuccessMessage(''), 5000)
      checkAdminAndFetchData()
    } catch (err) {
      console.error('Error deleting business:', err)
      setError('An error occurred while deleting the business')
      setTimeout(() => setError(''), 5000)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout onLogout={handleLogout}>
        <div className="px-4 py-8 max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-12 bg-gray-200 rounded" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
            <div className="p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-12 bg-gray-200 rounded flex-1" />
                    <div className="h-12 bg-gray-200 rounded w-32" />
                    <div className="h-12 bg-gray-200 rounded w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <>
      <Head>
        <title>Businesses — Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminLayout onLogout={handleLogout}>
        <div className="px-4 py-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Businesses</h1>
            <p className="text-gray-600 mt-1">Search, adjust tiers, and manage accounts</p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm font-medium">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

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
                          <a href={`mailto:${business.owner_email}`} className="text-gray-600 hover:underline">
                            {business.owner_email}
                          </a>
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
                      <td className="px-6 py-4 text-gray-600">{new Date(business.created_at).toLocaleDateString()}</td>
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
                            type="button"
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
                <p className="text-gray-500">{searchQuery ? 'No businesses found matching your search.' : 'No businesses yet.'}</p>
              </div>
            )}
          </div>

          <a
            href="https://usereviewflo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-8 transition-opacity hover:opacity-70"
          >
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <span>Powered by</span>
              <div className="relative w-24 h-6">
                <Image src="/images/reviewflo-logo.svg" alt="ReviewFlo" fill className="object-contain" />
              </div>
            </div>
          </a>
        </div>
      </AdminLayout>
    </>
  )
}

