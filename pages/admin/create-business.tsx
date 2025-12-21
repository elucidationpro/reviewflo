import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { checkIsAdmin } from '../../lib/adminAuth'

interface FormData {
  businessName: string
  ownerName: string
  ownerEmail: string
  phone: string
  businessType: string
  primaryColor: string
  googleReviewUrl: string
  facebookReviewUrl: string
  yelpReviewUrl: string
  nextdoorReviewUrl: string
  sendWelcomeEmail: boolean
  template1: string
  template2: string
  template3: string
}

export default function CreateBusinessPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [createdBusinessSlug, setCreatedBusinessSlug] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    ownerName: '',
    ownerEmail: '',
    phone: '',
    businessType: '',
    primaryColor: '#3B82F6',
    googleReviewUrl: '',
    facebookReviewUrl: '',
    yelpReviewUrl: '',
    nextdoorReviewUrl: '',
    sendWelcomeEmail: true,
    template1: '',
    template2: '',
    template3: '',
  })

  useEffect(() => {
    checkAdmin()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-fill form from query params (for beta signups)
  useEffect(() => {
    const { name, email, phone, businessName, businessType } = router.query

    if (name || email || businessName) {
      setFormData(prev => ({
        ...prev,
        ownerName: (name as string) || prev.ownerName,
        ownerEmail: (email as string) || prev.ownerEmail,
        phone: (phone as string) || prev.phone,
        businessName: (businessName as string) || prev.businessName,
        businessType: (businessType as string) || prev.businessType,
      }))
    }
  }, [router.query])

  const checkAdmin = async () => {
    const adminUser = await checkIsAdmin()
    if (!adminUser) {
      router.push('/login')
      return
    }
    setIsLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    setShowSuccess(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/create-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          businessName: formData.businessName.trim(),
          ownerName: formData.ownerName.trim(),
          ownerEmail: formData.ownerEmail.trim(),
          phone: formData.phone.trim() || undefined,
          businessType: formData.businessType || undefined,
          primaryColor: formData.primaryColor,
          googleReviewUrl: formData.googleReviewUrl.trim() || undefined,
          facebookReviewUrl: formData.facebookReviewUrl.trim() || undefined,
          yelpReviewUrl: formData.yelpReviewUrl.trim() || undefined,
          nextdoorReviewUrl: formData.nextdoorReviewUrl.trim() || undefined,
          sendWelcomeEmail: formData.sendWelcomeEmail,
          template1: formData.template1.trim() || undefined,
          template2: formData.template2.trim() || undefined,
          template3: formData.template3.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create business')
      }

      setGeneratedPassword(data.password)
      setCreatedBusinessSlug(data.slug)
      setShowSuccess(true)

      // Reset form
      setFormData({
        businessName: '',
        ownerName: '',
        ownerEmail: '',
        phone: '',
        businessType: '',
        primaryColor: '#3B82F6',
        googleReviewUrl: '',
        facebookReviewUrl: '',
        yelpReviewUrl: '',
        nextdoorReviewUrl: '',
        sendWelcomeEmail: true,
        template1: '',
        template2: '',
        template3: '',
      })

      setIsSubmitting(false)
    } catch (err) {
      const error = err as Error
      console.error('Error creating business:', error)
      setError(error.message || 'Failed to create business')
      setIsSubmitting(false)
    }
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

  return (
    <>
      <Head>
        <title>Create Business - Admin Dashboard</title>
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
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Create New Business</h1>
                  <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">ADMIN</span>
                </div>
                <p className="text-gray-600 mt-2">Pre-create a fully configured business account</p>
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
          {showSuccess && generatedPassword && (
            <div className="mb-6 bg-green-50 border-2 border-green-200 rounded-lg p-6">
              <div className="flex items-start mb-4">
                <svg className="w-6 h-6 text-green-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-green-800 font-bold text-lg mb-2">Business Created Successfully!</h3>
                  <div className="bg-white border border-green-300 rounded-lg p-4 mb-4">
                    <p className="text-green-800 font-semibold mb-2">Generated Password (save this!):</p>
                    <code className="block bg-gray-100 p-3 rounded text-red-600 font-mono text-lg font-bold break-all">
                      {generatedPassword}
                    </code>
                  </div>
                  <p className="text-green-700 mb-2">
                    <strong>Review Page:</strong>{' '}
                    <a
                      href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/${createdBusinessSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {process.env.NEXT_PUBLIC_APP_URL || 'https://usereviewflo.com'}/{createdBusinessSlug}
                    </a>
                  </p>
                  {formData.sendWelcomeEmail && (
                    <p className="text-green-700">Welcome email with credentials has been sent to the owner.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Information */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Information</h2>

              <div className="space-y-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="ownerName" className="block text-sm font-semibold text-gray-700 mb-2">
                      Owner Name *
                    </label>
                    <input
                      type="text"
                      id="ownerName"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="ownerEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                      Owner Email *
                    </label>
                    <input
                      type="email"
                      id="ownerEmail"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>

                  <div>
                    <label htmlFor="businessType" className="block text-sm font-semibold text-gray-700 mb-2">
                      Business Type (optional)
                    </label>
                    <select
                      id="businessType"
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    >
                      <option value="">Select industry...</option>
                      <option value="Auto Detailing">Auto Detailing</option>
                      <option value="Mobile Mechanic">Mobile Mechanic</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Plumber">Plumber</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Landscaping">Landscaping</option>
                      <option value="Home Services">Home Services</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="primaryColor" className="block text-sm font-semibold text-gray-700 mb-2">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      id="primaryColor"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="h-12 w-24 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Review Platform URLs */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Platform URLs (Optional)</h2>

              <div className="space-y-6">
                <div>
                  <label htmlFor="googleReviewUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                    Google Review URL
                  </label>
                  <input
                    type="url"
                    id="googleReviewUrl"
                    value={formData.googleReviewUrl}
                    onChange={(e) => setFormData({ ...formData, googleReviewUrl: e.target.value })}
                    placeholder="https://g.page/business-name/review"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="facebookReviewUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                    Facebook Review URL
                  </label>
                  <input
                    type="url"
                    id="facebookReviewUrl"
                    value={formData.facebookReviewUrl}
                    onChange={(e) => setFormData({ ...formData, facebookReviewUrl: e.target.value })}
                    placeholder="https://www.facebook.com/page/reviews"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="yelpReviewUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                    Yelp Review URL
                  </label>
                  <input
                    type="url"
                    id="yelpReviewUrl"
                    value={formData.yelpReviewUrl}
                    onChange={(e) => setFormData({ ...formData, yelpReviewUrl: e.target.value })}
                    placeholder="https://www.yelp.com/biz/business-name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>

                <div>
                  <label htmlFor="nextdoorReviewUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                    Nextdoor Review URL
                  </label>
                  <input
                    type="url"
                    id="nextdoorReviewUrl"
                    value={formData.nextdoorReviewUrl}
                    onChange={(e) => setFormData({ ...formData, nextdoorReviewUrl: e.target.value })}
                    placeholder="https://nextdoor.com/pages/business-name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Review Templates */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Review Templates (Optional)</h2>
              <p className="text-gray-600 mb-6 text-sm">
                Pre-configure up to 3 generic review templates that customers can choose from. Leave blank to use defaults.
              </p>

              <div className="space-y-6">
                <div>
                  <label htmlFor="template1" className="block text-sm font-semibold text-gray-700 mb-2">
                    Review Template 1
                  </label>
                  <textarea
                    id="template1"
                    value={formData.template1}
                    onChange={(e) => setFormData({ ...formData, template1: e.target.value })}
                    placeholder="I had an excellent experience with [Business Name]! The service exceeded my expectations. Highly recommend!"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default template will be used if left blank</p>
                </div>

                <div>
                  <label htmlFor="template2" className="block text-sm font-semibold text-gray-700 mb-2">
                    Review Template 2
                  </label>
                  <textarea
                    id="template2"
                    value={formData.template2}
                    onChange={(e) => setFormData({ ...formData, template2: e.target.value })}
                    placeholder="Just had a great experience with [Business Name]! Professional service and fantastic results. 5 stars!"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default template will be used if left blank</p>
                </div>

                <div>
                  <label htmlFor="template3" className="block text-sm font-semibold text-gray-700 mb-2">
                    Review Template 3
                  </label>
                  <textarea
                    id="template3"
                    value={formData.template3}
                    onChange={(e) => setFormData({ ...formData, template3: e.target.value })}
                    placeholder="5 stars for [Business Name]! Quality work, professional service, and fair pricing. Will definitely use again."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default template will be used if left blank</p>
                </div>
              </div>
            </div>

            {/* Email Options */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Email Options</h2>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sendWelcomeEmail}
                  onChange={(e) => setFormData({ ...formData, sendWelcomeEmail: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-3 text-gray-700 font-medium">Send welcome email with login credentials to owner</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Link
                href="/admin"
                className="px-8 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Business...' : 'Create Business'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
