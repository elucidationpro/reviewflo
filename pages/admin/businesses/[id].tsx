import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { checkIsAdmin } from '../../../lib/adminAuth'
import AdminLayout from '@/components/AdminLayout'

interface Business {
  id: string
  business_name: string
  owner_name?: string | null
  owner_email: string
  slug: string
  primary_color: string
  logo_url: string | null
  google_review_url: string | null
  facebook_review_url: string | null
  yelp_review_url: string | null
  nextdoor_review_url: string | null
  user_id: string
  created_at: string
  reviews_count?: number
  feedback_count?: number
}

interface ReviewTemplate {
  id: string
  platform: string
  template_text: string
}

type BizTab = 'overview' | 'account' | 'links' | 'templates' | 'danger'

export default function EditBusinessPage() {
  const router = useRouter()
  const { id } = router.query
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingTemplates, setIsSavingTemplates] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [templates, setTemplates] = useState<ReviewTemplate[]>([])
  const [googleTemplate, setGoogleTemplate] = useState('')
  const [facebookTemplate, setFacebookTemplate] = useState('')
  const [yelpTemplate, setYelpTemplate] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [templateSuccess, setTemplateSuccess] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [isClearingReviewsFeedback, setIsClearingReviewsFeedback] = useState(false)
  const [dangerOpen, setDangerOpen] = useState(false)
  const [dangerConfirmText, setDangerConfirmText] = useState('')

  const activeTab: BizTab = (() => {
    const t = router.query.tab
    if (t === 'overview' || t === 'account' || t === 'links' || t === 'templates' || t === 'danger') return t
    return 'account'
  })()

  const goTab = (tab: BizTab) => {
    router.push(
      {
        pathname: router.pathname,
        query: { ...router.query, tab },
      },
      undefined,
      { shallow: true }
    )
  }

  useEffect(() => {
    if (id) {
      checkAdminAndFetchBusiness()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const checkAdminAndFetchBusiness = async () => {
    try {
      const adminUser = await checkIsAdmin()
      if (!adminUser) {
        router.push('/login')
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      // Fetch all businesses to find this one
      const response = await fetch('/api/admin/get-businesses', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const foundBusiness = data.businesses.find((b: Business) => b.id === id)
        if (foundBusiness) {
          setBusiness(foundBusiness)

          // Fetch templates for this business
          const { data: templatesData, error: templatesError } = await supabase
            .from('review_templates')
            .select('id, platform, template_text')
            .eq('business_id', id)

          if (!templatesError && templatesData) {
            setTemplates(templatesData)

            // Set individual template states
            const googleTpl = templatesData.find((t: ReviewTemplate) => t.platform === 'google')
            const facebookTpl = templatesData.find((t: ReviewTemplate) => t.platform === 'facebook')
            const yelpTpl = templatesData.find((t: ReviewTemplate) => t.platform === 'yelp')

            setGoogleTemplate(googleTpl?.template_text || '')
            setFacebookTemplate(facebookTpl?.template_text || '')
            setYelpTemplate(yelpTpl?.template_text || '')
          }
        } else {
          setError('Business not found')
        }
      }

      setIsLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load business')
      setIsLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return

    setError('')
    setSuccess('')
    setIsSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/update-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          businessId: business.id,
          businessName: business.business_name,
          ownerName: business.owner_name ?? undefined,
          ownerEmail: business.owner_email,
          primaryColor: business.primary_color,
          logoUrl: business.logo_url,
          googleReviewUrl: business.google_review_url,
          facebookReviewUrl: business.facebook_review_url,
          yelpReviewUrl: business.yelp_review_url,
          nextdoorReviewUrl: business.nextdoor_review_url,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update business')
      }

      setSuccess('Business updated successfully')
      setIsSaving(false)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to update business')
      setIsSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!business || !confirm("Are you sure you want to reset this user's password?")) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId: business.user_id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setResetPassword(data.password)
      setSuccess('Password reset successfully')
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to reset password')
    }
  }

  const handleSaveTemplates = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return

    setTemplateSuccess('')
    setError('')
    setIsSavingTemplates(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/update-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          businessId: business.id,
          googleTemplate: googleTemplate.trim() || undefined,
          facebookTemplate: facebookTemplate.trim() || undefined,
          yelpTemplate: yelpTemplate.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update templates')
      }

      setTemplateSuccess('Templates updated successfully')
      setIsSavingTemplates(false)
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to update templates')
      setIsSavingTemplates(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navExtra = business ? (
    <>
      <button
        type="button"
        onClick={() => goTab('overview')}
        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
          activeTab === 'overview' ? 'bg-[#4A3428]/[0.07] text-[#4A3428]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        Overview
      </button>
      <button
        type="button"
        onClick={() => goTab('account')}
        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
          activeTab === 'account' ? 'bg-[#4A3428]/[0.07] text-[#4A3428]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        Account
      </button>
      <button
        type="button"
        onClick={() => goTab('links')}
        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
          activeTab === 'links' ? 'bg-[#4A3428]/[0.07] text-[#4A3428]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        Review links
      </button>
      <button
        type="button"
        onClick={() => goTab('templates')}
        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
          activeTab === 'templates' ? 'bg-[#4A3428]/[0.07] text-[#4A3428]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        Templates
      </button>
      <button
        type="button"
        onClick={() => goTab('danger')}
        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
          activeTab === 'danger' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        Danger zone
      </button>
    </>
  ) : null

  const handleClearReviewsFeedback = async () => {
    if (!business || !confirm('Clear ALL reviews and feedback for this business? This cannot be undone.')) {
      return
    }

    setIsClearingReviewsFeedback(true)
    setError('')
    setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/clear-business-reviews-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ businessId: business.id }),
      })

      const data = await response.json()

      if (response.ok) {
        setBusiness(prev => prev ? { ...prev, reviews_count: 0, feedback_count: 0 } : null)
        setSuccess('All reviews and feedback have been cleared.')
        await checkAdminAndFetchBusiness()
      } else {
        setError(data.error || 'Failed to clear reviews and feedback')
      }
    } catch (err) {
      const error = err as Error
      setError(error.message || 'Failed to clear')
    } finally {
      setIsClearingReviewsFeedback(false)
    }
  }

  if (isLoading) {
    return (
      <AdminLayout onLogout={handleLogout}>
        <div className="min-h-[50vh] flex items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4A3428] mx-auto" />
            <p className="text-gray-600 mt-4">Loading…</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!business) {
    return (
      <AdminLayout onLogout={handleLogout}>
        <div className="min-h-[40vh] flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-red-600 text-lg">{error || 'Business not found'}</p>
            <Link href="/admin" className="text-[#4A3428] hover:underline mt-4 inline-block font-semibold">
              Back to overview
            </Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <>
      <Head>
        <title>{`Edit ${business.business_name} - Admin Dashboard`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <AdminLayout onLogout={handleLogout} navExtra={navExtra}>
        <div className="px-4 py-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <Link
              href="/admin"
              className="inline-flex items-center text-sm font-semibold text-[#4A3428] hover:underline mb-4"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to overview
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Edit business</h1>
            <p className="text-gray-600 mt-1">{business.business_name}</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* ── Tab content ── */}
          {activeTab === 'overview' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-6">At a glance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Reviews</p>
                  <p className="text-3xl font-bold text-gray-900">{business.reviews_count || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Feedback</p>
                  <p className="text-3xl font-bold text-gray-900">{business.feedback_count || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Created</p>
                  <p className="text-lg font-semibold text-gray-900">{new Date(business.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                <Link
                  href={`/${business.slug}`}
                  target="_blank"
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-colors"
                >
                  View review page
                </Link>
                <button
                  type="button"
                  onClick={() => goTab('account')}
                  className="px-4 py-2 bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold rounded-lg transition-colors"
                >
                  Edit account →
                </button>
                <button
                  type="button"
                  onClick={() => goTab('links')}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg transition-colors"
                >
                  Review links →
                </button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-6">Account</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                    <input
                      type="text"
                      value={business.business_name}
                      onChange={(e) => setBusiness({ ...business, business_name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Owner Name</label>
                    <input
                      type="text"
                      value={business.owner_name ?? ''}
                      onChange={(e) => setBusiness({ ...business, owner_name: e.target.value })}
                      placeholder="e.g. Jane Smith"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used when emailing this client directly.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Owner Email</label>
                    <input
                      type="email"
                      value={business.owner_email}
                      onChange={(e) => setBusiness({ ...business, owner_email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Slug (URL)</label>
                    <input
                      type="text"
                      value={business.slug}
                      disabled
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Slug cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Primary Color</label>
                    <div className="flex gap-4">
                      <input
                        type="color"
                        value={business.primary_color}
                        onChange={(e) => setBusiness({ ...business, primary_color: e.target.value })}
                        className="h-12 w-24 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        value={business.primary_color}
                        onChange={(e) => setBusiness({ ...business, primary_color: e.target.value })}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A961] text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Link
                  href="/admin"
                  className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </Link>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'links' && (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-6">Review links</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Google Review URL</label>
                    <input
                      type="url"
                      value={business.google_review_url || ''}
                      onChange={(e) => setBusiness({ ...business, google_review_url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Facebook Review URL</label>
                    <input
                      type="url"
                      value={business.facebook_review_url || ''}
                      onChange={(e) => setBusiness({ ...business, facebook_review_url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Yelp Review URL</label>
                    <input
                      type="url"
                      value={business.yelp_review_url || ''}
                      onChange={(e) => setBusiness({ ...business, yelp_review_url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nextdoor Review URL</label>
                    <input
                      type="url"
                      value={business.nextdoor_review_url || ''}
                      onChange={(e) => setBusiness({ ...business, nextdoor_review_url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => goTab('account')}
                  className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'templates' && (
            <form onSubmit={handleSaveTemplates} className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight mb-2">Templates</h2>
                <p className="text-gray-600 mb-6 text-sm">These show on /{business.slug}/templates</p>

                {templateSuccess && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm">{templateSuccess}</p>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <label htmlFor="googleTemplateEdit" className="block text-sm font-semibold text-gray-700 mb-2">
                      Template 1
                    </label>
                    <textarea
                      id="googleTemplateEdit"
                      value={googleTemplate}
                      onChange={(e) => setGoogleTemplate(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="facebookTemplateEdit" className="block text-sm font-semibold text-gray-700 mb-2">
                      Template 2
                    </label>
                    <textarea
                      id="facebookTemplateEdit"
                      value={facebookTemplate}
                      onChange={(e) => setFacebookTemplate(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label htmlFor="yelpTemplateEdit" className="block text-sm font-semibold text-gray-700 mb-2">
                      Template 3
                    </label>
                    <textarea
                      id="yelpTemplateEdit"
                      value={yelpTemplate}
                      onChange={(e) => setYelpTemplate(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C9A961] focus:border-transparent text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between gap-3 flex-wrap">
                  <Link
                    href={`/${business.slug}/templates`}
                    target="_blank"
                    className="text-sm font-semibold text-[#4A3428] hover:underline"
                  >
                    Preview templates →
                  </Link>
                  <button
                    type="submit"
                    disabled={isSavingTemplates}
                    className="px-6 py-2.5 bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingTemplates ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-6">
              {resetPassword && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                  <h3 className="text-yellow-900 font-bold mb-2">New password generated</h3>
                  <code className="block bg-white p-3 rounded text-red-600 font-mono text-lg font-bold break-all">{resetPassword}</code>
                  <p className="text-yellow-800 text-sm mt-2">Save this password — it won’t be shown again.</p>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Danger zone</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Actions here are irreversible. They’re intentionally tucked away to prevent accidents.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDangerOpen((v) => !v)}
                    className="px-3 py-2 text-sm font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    {dangerOpen ? 'Hide' : 'Show'}
                  </button>
                </div>

                {dangerOpen && (
                  <div className="mt-6 space-y-6">
                    <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900 mb-1">Confirm you mean it</p>
                      <p className="text-xs text-gray-600">
                        Type <span className="font-mono font-bold">{business.slug}</span> to enable destructive actions.
                      </p>
                      <input
                        value={dangerConfirmText}
                        onChange={(e) => setDangerConfirmText(e.target.value)}
                        className="mt-3 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A961]"
                        placeholder={business.slug}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between p-4 rounded-xl border border-gray-200">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Reset password</p>
                        <p className="text-xs text-gray-600 mt-0.5">Generates a new password for the owner.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        disabled={dangerConfirmText.trim() !== business.slug}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-red-200 text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Reset password…
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between p-4 rounded-xl border border-gray-200">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Clear all reviews &amp; feedback</p>
                        <p className="text-xs text-gray-600 mt-0.5">Deletes all review + feedback history for this business.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearReviewsFeedback}
                        disabled={
                          dangerConfirmText.trim() !== business.slug ||
                          isClearingReviewsFeedback ||
                          ((business.reviews_count || 0) === 0 && (business.feedback_count || 0) === 0)
                        }
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isClearingReviewsFeedback ? 'Clearing…' : 'Clear data'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  )
}
