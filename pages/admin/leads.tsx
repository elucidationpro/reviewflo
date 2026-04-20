import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { checkIsAdmin } from '../../lib/adminAuth'
import AdminLayout from '@/components/AdminLayout'

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

export default function AdminLeadsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [betaSignups, setBetaSignups] = useState<BetaSignup[]>([])
  const [waitlistSignups, setWaitlistSignups] = useState<WaitlistSignup[]>([])
  const [earlyAccessSignups, setEarlyAccessSignups] = useState<EarlyAccessSignup[]>([])
  const [error, setError] = useState('')
  const [deletingEarlyAccessId, setDeletingEarlyAccessId] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadLeads = async () => {
    try {
      const adminUser = await checkIsAdmin()
      if (!adminUser) {
        router.push('/login?redirect=/admin/leads')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const [betaRes, waitlistRes, earlyRes] = await Promise.all([
        fetch('/api/admin/get-beta-signups', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch('/api/admin/get-waitlist-signups', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch('/api/admin/get-early-access', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ])

      if (betaRes.ok) {
        const d = await betaRes.json()
        setBetaSignups(d.betaSignups || [])
      }
      if (waitlistRes.ok) {
        const d = await waitlistRes.json()
        setWaitlistSignups(d.waitlistSignups || [])
      }
      if (earlyRes.ok) {
        const d = await earlyRes.json()
        setEarlyAccessSignups(d.earlyAccessSignups || [])
      }

      setIsLoading(false)
    } catch (err) {
      console.error(err)
      setError('Failed to load leads')
      setIsLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (isClearing) return
    setSuccess('')
    setError('')
    if (!confirm('Clear ALL leads & signups data? This cannot be undone.')) return
    if (!confirm('Last check: this will delete Early access, Beta signups, Waitlist, and Leads rows. Continue?')) return

    setIsClearing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired. Please refresh.')
        return
      }

      const response = await fetch('/api/admin/clear-leads-and-signups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ confirm: 'CLEAR_LEADS_AND_SIGNUPS' }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Failed to clear data')
        return
      }

      setEarlyAccessSignups([])
      setBetaSignups([])
      setWaitlistSignups([])
      const cleared = payload?.cleared
      const summary = cleared
        ? `Cleared — Early access: ${cleared.early_access_signups}, Beta: ${cleared.beta_signups}, Waitlist: ${cleared.waitlist}, Leads: ${cleared.leads}`
        : 'Cleared leads & signups data.'
      setSuccess(summary)
    } catch (err) {
      console.error(err)
      setError('Failed to clear data')
    } finally {
      setIsClearing(false)
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
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id: signupId }),
      })

      if (response.ok) {
        setEarlyAccessSignups((prev) => prev.filter((s) => s.id !== signupId))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to remove')
      }
    } catch {
      setError('Failed to remove')
    } finally {
      setDeletingEarlyAccessId(null)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout onLogout={handleLogout}>
        <div className="px-4 py-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-100 rounded-2xl" />
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <>
      <Head>
        <title>Leads &amp; signups — Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AdminLayout onLogout={handleLogout}>
        <div className="px-4 py-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Leads &amp; signups</h1>
                <p className="text-gray-600 mt-1">Early access, beta, and waitlist entries</p>
              </div>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearing}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isClearing ? 'Clearing…' : 'Clear test data'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900">{success}</div>
          )}

          {/* Early Access */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-4">
              Early access ({earlyAccessSignups.length})
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
                          <a href={`mailto:${row.email}`} className="text-gray-900 hover:text-[#4A3428] hover:underline">
                            {row.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{row.full_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{row.business_type || '—'}</td>
                        <td className="px-4 py-3">
                          {row.stripe_session_id ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Yes</span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No</span>
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

          {/* Beta */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-4">Beta signups ({betaSignups.length})</h2>
            {betaSignups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Phone</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Signed up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {betaSignups.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                        <td className="px-4 py-3">
                          <a href={`mailto:${row.email}`} className="text-[#4A3428] hover:underline">
                            {row.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{row.phone}</td>
                        <td className="px-4 py-3 text-gray-700">{row.business_name}</td>
                        <td className="px-4 py-3 text-gray-600">{row.business_type}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No beta signups.</p>
            )}
          </div>

          {/* Waitlist */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-4">Waitlist ({waitlistSignups.length})</h2>
            {waitlistSignups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Signed up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {waitlistSignups.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          <a href={`mailto:${row.email}`} className="text-[#4A3428] hover:underline">
                            {row.email}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{row.business_name}</td>
                        <td className="px-4 py-3 text-gray-600">{row.business_type}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No waitlist entries.</p>
            )}
          </div>
        </div>
      </AdminLayout>
    </>
  )
}
