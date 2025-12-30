import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import { checkIsAdmin } from '../../../lib/adminAuth'

interface Business {
  id: string
  business_name: string
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
    if (!business || !confirm('Are you sure you want to reset this user&apos;s password?')) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'Business not found'}</p>
          <Link href="/admin" className="text-blue-600 hover:underline mt-4 inline-block">
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Edit {business.business_name} - Admin Dashboard</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/admin"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Admin Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Edit Business</h1>
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">ADMIN</span>
                </div>
                <p className="text-gray-600 mt-2">{business.business_name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* Reset Password Display */}
          {resetPassword && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <h3 className="text-yellow-800 font-bold mb-2">New Password Generated:</h3>
              <code className="block bg-white p-3 rounded text-red-600 font-mono text-lg font-bold">
                {resetPassword}
              </code>
              <p className="text-yellow-700 text-sm mt-2">Save this password - it won&apos;t be shown again!</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Stats Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Stats</h2>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-gray-600 text-sm">Total Reviews</p>
                <p className="text-3xl font-bold text-blue-600">{business.reviews_count || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Feedback</p>
                <p className="text-3xl font-bold text-orange-600">{business.feedback_count || 0}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Created</p>
                <p className="text-lg font-semibold text-gray-700">
                  {new Date(business.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleResetPassword}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-colors"
              >
                Reset Password
              </button>
              <Link
                href={`/${business.slug}`}
                target="_blank"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
              >
                View Review Page
              </Link>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave} className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Information</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    value={business.business_name}
                    onChange={(e) => setBusiness({ ...business, business_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Owner Email</label>
                  <input
                    type="email"
                    value={business.owner_email}
                    onChange={(e) => setBusiness({ ...business, owner_email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Platform URLs</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Google Review URL</label>
                  <input
                    type="url"
                    value={business.google_review_url || ''}
                    onChange={(e) => setBusiness({ ...business, google_review_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Facebook Review URL</label>
                  <input
                    type="url"
                    value={business.facebook_review_url || ''}
                    onChange={(e) => setBusiness({ ...business, facebook_review_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Yelp Review URL</label>
                  <input
                    type="url"
                    value={business.yelp_review_url || ''}
                    onChange={(e) => setBusiness({ ...business, yelp_review_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nextdoor Review URL</label>
                  <input
                    type="url"
                    value={business.nextdoor_review_url || ''}
                    onChange={(e) => setBusiness({ ...business, nextdoor_review_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Link
                href="/admin"
                className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Review Templates Section */}
          <form onSubmit={handleSaveTemplates} className="space-y-6 mt-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Review Templates</h2>
              <p className="text-gray-600 mb-6 text-sm">
                Customize the review templates that customers will see on the templates page. These help them leave reviews quickly.
              </p>

              {/* Template Success Message */}
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
                    placeholder="I had an excellent experience with [Business Name]! [They/The service] exceeded my expectations. Highly recommend!"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Customers will be able to copy and paste this template</p>
                </div>

                <div>
                  <label htmlFor="facebookTemplateEdit" className="block text-sm font-semibold text-gray-700 mb-2">
                    Template 2
                  </label>
                  <textarea
                    id="facebookTemplateEdit"
                    value={facebookTemplate}
                    onChange={(e) => setFacebookTemplate(e.target.value)}
                    placeholder="Just had a great experience with [Business Name]! Professional service and fantastic results. 5 stars! ⭐⭐⭐⭐⭐"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Customers will be able to copy and paste this template</p>
                </div>

                <div>
                  <label htmlFor="yelpTemplateEdit" className="block text-sm font-semibold text-gray-700 mb-2">
                    Template 3
                  </label>
                  <textarea
                    id="yelpTemplateEdit"
                    value={yelpTemplate}
                    onChange={(e) => setYelpTemplate(e.target.value)}
                    placeholder="5 stars for [Business Name]! Quality work, professional service, and fair pricing. Will definitely use again."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Customers will be able to copy and paste this template</p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Preview</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This is how customers will see the templates on{' '}
                  <Link
                    href={`/${business.slug}/templates`}
                    target="_blank"
                    className="text-blue-600 hover:underline"
                  >
                    /{business.slug}/templates
                  </Link>
                </p>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-4">
                  {googleTemplate && (
                    <div className="bg-white rounded-lg p-4 border border-gray-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Google</span>
                        <span className="text-xs text-gray-500">Copy to paste</span>
                      </div>
                      <p className="text-sm text-gray-700">{googleTemplate}</p>
                    </div>
                  )}
                  {facebookTemplate && (
                    <div className="bg-white rounded-lg p-4 border border-gray-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Facebook</span>
                        <span className="text-xs text-gray-500">Copy to paste</span>
                      </div>
                      <p className="text-sm text-gray-700">{facebookTemplate}</p>
                    </div>
                  )}
                  {yelpTemplate && (
                    <div className="bg-white rounded-lg p-4 border border-gray-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">Yelp</span>
                        <span className="text-xs text-gray-500">Copy to paste</span>
                      </div>
                      <p className="text-sm text-gray-700">{yelpTemplate}</p>
                    </div>
                  )}
                  {!googleTemplate && !facebookTemplate && !yelpTemplate && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No templates configured. Default templates will be used.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="submit"
                  disabled={isSavingTemplates}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingTemplates ? 'Saving Templates...' : 'Save Templates'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
