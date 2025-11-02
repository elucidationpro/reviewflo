import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

interface Business {
  id: string
  business_name: string
  primary_color: string
  logo_url: string | null
  google_review_url: string | null
  facebook_review_url: string | null
  yelp_review_url: string | null
  nextdoor_review_url: string | null
}

interface ReviewTemplate {
  id: string
  template_text: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')

  // Business data state
  const [businessData, setBusinessData] = useState<Business>({
    id: '',
    business_name: '',
    primary_color: '#3B82F6',
    logo_url: '',
    google_review_url: '',
    facebook_review_url: '',
    yelp_review_url: '',
    nextdoor_review_url: '',
  })

  // Review templates state
  const [templates, setTemplates] = useState<ReviewTemplate[]>([
    { id: '', template_text: '' },
    { id: '', template_text: '' },
    { id: '', template_text: '' },
  ])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Fetch business data
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (businessError) {
          console.error('Error fetching business:', businessError)
          setError('Failed to load business data')
          setIsLoading(false)
          return
        }

        setBusinessData({
          id: business.id,
          business_name: business.business_name,
          primary_color: business.primary_color || '#3B82F6',
          logo_url: business.logo_url || '',
          google_review_url: business.google_review_url || '',
          facebook_review_url: business.facebook_review_url || '',
          yelp_review_url: business.yelp_review_url || '',
          nextdoor_review_url: business.nextdoor_review_url || '',
        })

        // Fetch review templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('review_templates')
          .select('id, template_text')
          .eq('business_id', business.id)
          .order('created_at', { ascending: true })

        if (templatesError) {
          console.error('Error fetching templates:', templatesError)
        } else if (templatesData && templatesData.length > 0) {
          setTemplates(templatesData.slice(0, 3))
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('An unexpected error occurred')
        setIsLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setShowSuccess(false)
    setIsSaving(true)

    try {
      // Update business data
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          business_name: businessData.business_name,
          primary_color: businessData.primary_color,
          logo_url: businessData.logo_url || null,
          google_review_url: businessData.google_review_url || null,
          facebook_review_url: businessData.facebook_review_url || null,
          yelp_review_url: businessData.yelp_review_url || null,
          nextdoor_review_url: businessData.nextdoor_review_url || null,
        })
        .eq('id', businessData.id)

      if (businessError) {
        console.error('Error updating business:', businessError)
        setError('Failed to update business information')
        setIsSaving(false)
        return
      }

      // Update review templates
      for (const template of templates) {
        if (template.id) {
          const { error: templateError } = await supabase
            .from('review_templates')
            .update({ template_text: template.template_text })
            .eq('id', template.id)

          if (templateError) {
            console.error('Error updating template:', templateError)
          }
        }
      }

      setShowSuccess(true)
      setIsSaving(false)

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('An unexpected error occurred')
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Business Settings</h1>
          <p className="text-gray-600 mt-2">Manage your business information and review settings</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
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
              <p className="text-green-800 text-sm font-medium">Settings saved successfully!</p>
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

        <form onSubmit={handleSave} className="space-y-6">
          {/* Business Information Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Business Information</h2>

            <div className="space-y-6">
              {/* Business Name */}
              <div>
                <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  id="businessName"
                  value={businessData.business_name}
                  onChange={(e) => setBusinessData({ ...businessData, business_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  required
                />
              </div>

              {/* Primary Color */}
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-semibold text-gray-700 mb-2">
                  Primary Color *
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    id="primaryColor"
                    value={businessData.primary_color}
                    onChange={(e) => setBusinessData({ ...businessData, primary_color: e.target.value })}
                    className="h-12 w-24 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={businessData.primary_color}
                    onChange={(e) => setBusinessData({ ...businessData, primary_color: e.target.value })}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="#3B82F6"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  This color will be used for buttons and branding on your review pages
                </p>
              </div>

              {/* Logo URL */}
              <div>
                <label htmlFor="logoUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                  Logo URL (optional)
                </label>
                <input
                  type="url"
                  id="logoUrl"
                  value={businessData.logo_url || ''}
                  onChange={(e) => setBusinessData({ ...businessData, logo_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Enter a URL to your business logo (we&apos;ll add upload functionality later)
                </p>
              </div>
            </div>
          </div>

          {/* Review Platform URLs Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Platform URLs</h2>
            <p className="text-gray-600 mb-6">
              Add the URLs where customers can leave reviews for your business
            </p>

            <div className="space-y-6">
              {/* Google Review URL */}
              <div>
                <label htmlFor="googleUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                  Google Review URL
                </label>
                <input
                  type="url"
                  id="googleUrl"
                  value={businessData.google_review_url || ''}
                  onChange={(e) => setBusinessData({ ...businessData, google_review_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="https://g.page/your-business/review"
                />
              </div>

              {/* Facebook Review URL */}
              <div>
                <label htmlFor="facebookUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                  Facebook Review URL (optional)
                </label>
                <input
                  type="url"
                  id="facebookUrl"
                  value={businessData.facebook_review_url || ''}
                  onChange={(e) => setBusinessData({ ...businessData, facebook_review_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="https://www.facebook.com/your-page/reviews"
                />
              </div>

              {/* Yelp Review URL */}
              <div>
                <label htmlFor="yelpUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                  Yelp Review URL (optional)
                </label>
                <input
                  type="url"
                  id="yelpUrl"
                  value={businessData.yelp_review_url || ''}
                  onChange={(e) => setBusinessData({ ...businessData, yelp_review_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="https://www.yelp.com/biz/your-business"
                />
              </div>

              {/* Nextdoor Review URL */}
              <div>
                <label htmlFor="nextdoorUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                  Nextdoor Review URL (optional)
                </label>
                <input
                  type="url"
                  id="nextdoorUrl"
                  value={businessData.nextdoor_review_url || ''}
                  onChange={(e) => setBusinessData({ ...businessData, nextdoor_review_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="https://nextdoor.com/pages/your-business"
                />
              </div>
            </div>
          </div>

          {/* Review Templates Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Templates</h2>
            <p className="text-gray-600 mb-6">
              Create templates that happy customers can copy and paste into their reviews
            </p>

            <div className="space-y-6">
              {templates.map((template, index) => (
                <div key={template.id || index}>
                  <label
                    htmlFor={`template${index + 1}`}
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Template {index + 1}
                  </label>
                  <textarea
                    id={`template${index + 1}`}
                    value={template.template_text}
                    onChange={(e) => {
                      const newTemplates = [...templates]
                      newTemplates[index] = { ...newTemplates[index], template_text: e.target.value }
                      setTemplates(newTemplates)
                    }}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder="Enter a review template that customers can use..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard"
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-[1.02]"
            >
              {isSaving ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
