import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import OnboardingProgress from '../components/OnboardingProgress'
import { trackEvent } from '../lib/posthog-provider'
import { canAccessMultiPlatform, canRemoveBranding, getTemplateSlots, canAccessGoogleStats } from '../lib/tier-permissions'

interface Business {
  id: string
  business_name: string
  primary_color: string
  logo_url: string | null
  skip_template_choice: boolean
  google_review_url: string | null
  facebook_review_url: string | null
  yelp_review_url: string | null
  nextdoor_review_url: string | null
  tier: 'free' | 'pro' | 'ai'
  interested_in_tier: 'pro' | 'ai' | null
  notify_on_launch: boolean
  launch_discount_eligible: boolean
  launch_discount_claimed: boolean
  show_reviewflo_branding: boolean
  google_place_id: string | null
}

interface ReviewTemplate {
  id: string
  template_text: string
  platform: 'google' | 'facebook' | 'yelp'
}

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [migrationWarning, setMigrationWarning] = useState('')
  const [error, setError] = useState('')
  const [planSaving, setPlanSaving] = useState(false)
  const [planMessage, setPlanMessage] = useState('')
  const [planError, setPlanError] = useState('')

  // Business data state
  const [businessData, setBusinessData] = useState<Business>({
    id: '',
    business_name: '',
    primary_color: '#3B82F6',
    logo_url: '',
    skip_template_choice: false,
    google_review_url: '',
    facebook_review_url: '',
    yelp_review_url: '',
    nextdoor_review_url: '',
    tier: 'free',
    interested_in_tier: null,
    notify_on_launch: false,
    launch_discount_eligible: true,
    launch_discount_claimed: false,
    show_reviewflo_branding: true,
    google_place_id: null,
  })

  // Review templates state - 3 generic templates (platform is just used as ID)
  const [templates, setTemplates] = useState<ReviewTemplate[]>([
    { id: '', template_text: '', platform: 'google' },
    { id: '', template_text: '', platform: 'facebook' },
    { id: '', template_text: '', platform: 'yelp' },
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
          skip_template_choice: business.skip_template_choice ?? false,
          google_review_url: business.google_review_url || '',
          facebook_review_url: business.facebook_review_url || '',
          yelp_review_url: business.yelp_review_url || '',
          nextdoor_review_url: business.nextdoor_review_url || '',
          tier: (business.tier as 'free' | 'pro' | 'ai') || 'free',
          interested_in_tier: (business.interested_in_tier as 'pro' | 'ai' | null) ?? null,
          notify_on_launch: business.notify_on_launch ?? false,
          launch_discount_eligible: business.launch_discount_eligible ?? true,
          launch_discount_claimed: business.launch_discount_claimed ?? false,
          show_reviewflo_branding: business.show_reviewflo_branding ?? true,
          google_place_id: business.google_place_id || null,
        })

        // Fetch review templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('review_templates')
          .select('id, template_text, platform')
          .eq('business_id', business.id)
          .order('platform', { ascending: true })

        if (templatesError) {
          console.error('Error fetching templates:', templatesError)
        } else if (templatesData && templatesData.length > 0) {
          // Map templates in display order: Template 1 (google), Template 2 (facebook), Template 3 (yelp)
          const googleTemplate = templatesData.find(t => t.platform === 'google')
          const facebookTemplate = templatesData.find(t => t.platform === 'facebook')
          const yelpTemplate = templatesData.find(t => t.platform === 'yelp')

          setTemplates([
            googleTemplate || { id: '', template_text: '', platform: 'google' },
            facebookTemplate || { id: '', template_text: '', platform: 'facebook' },
            yelpTemplate || { id: '', template_text: '', platform: 'yelp' },
          ])
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

  const handlePlanPreferenceClick = async (tier: 'pro' | 'ai' | null) => {
    setPlanError('')
    setPlanMessage('')
    setPlanSaving(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setPlanError('Session expired. Please log in again.')
        setPlanSaving(false)
        return
      }

      const res = await fetch('/api/update-launch-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          businessId: businessData.id,
          interestedInTier: tier,
          notifyOnLaunch: tier !== null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPlanError(
          data?.error ||
            'Failed to update launch notification preference. Please try again.'
        )
        setPlanSaving(false)
        return
      }

      const updatedTier = (data?.interested_in_tier ?? tier) as 'pro' | 'ai' | null
      const updatedNotify = data?.notify_on_launch ?? (tier !== null)

      setBusinessData((prev) => ({
        ...prev,
        interested_in_tier: updatedTier,
        notify_on_launch: updatedNotify,
      }))

      if (tier) {
        const label = tier === 'pro' ? 'Pro' : 'AI'
        setPlanMessage(`We'll email you when ${label} launches in May 2026.`)
        trackEvent('upgrade_notification_requested', {
          tier,
          source: 'settings',
        })
      } else {
        setPlanMessage('You will stay on the Free plan. We will not send Pro/AI launch emails.')
      }
    } catch (err) {
      console.error('Error updating launch preference from settings:', err)
      setPlanError('An unexpected error occurred. Please try again.')
    } finally {
      setPlanSaving(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMigrationWarning('')
    setShowSuccess(false)
    setIsSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired. Please log in again.')
        setIsSaving(false)
        return
      }

      const res = await fetch('/api/update-business-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          businessId: businessData.id,
          businessName: businessData.business_name,
          primaryColor: businessData.primary_color,
          logoUrl: businessData.logo_url || null,
          skipTemplateChoice: businessData.skip_template_choice,
          googleReviewUrl: businessData.google_review_url || null,
          facebookReviewUrl: businessData.facebook_review_url || null,
          yelpReviewUrl: businessData.yelp_review_url || null,
          nextdoorReviewUrl: businessData.nextdoor_review_url || null,
          showReviewfloBranding: businessData.show_reviewflo_branding,
          googlePlaceId: businessData.google_place_id || null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to update business information')
        setError(msg)
        setIsSaving(false)
        return
      }

      if (data.templateSettingSkipped) {
        setMigrationWarning(data.message || 'The template choice option requires a database migration — run add-skip-template-choice-migration.sql in Supabase.')
      }

      // Update review templates (upsert for each platform)
      for (const template of templates) {
        if (template.id) {
          // Update existing template
          const { error: templateError } = await supabase
            .from('review_templates')
            .update({ template_text: template.template_text })
            .eq('id', template.id)

          if (templateError) {
            console.error('Error updating template:', templateError)
          }
        } else if (template.template_text) {
          // Create new template if it doesn't exist
          const { error: templateError } = await supabase
            .from('review_templates')
            .insert({
              business_id: businessData.id,
              platform: template.platform,
              template_text: template.template_text
            })

          if (templateError) {
            console.error('Error creating template:', templateError)
          }
        }
      }

      setShowSuccess(true)
      setIsSaving(false)

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false)
        setMigrationWarning('')
      }, 6000)
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

  const hasCustomColor = businessData.primary_color && businessData.primary_color !== '#3B82F6'
  const currentPlanLabel =
    businessData.tier === 'pro' ? 'Pro' : businessData.tier === 'ai' ? 'AI' : 'Free'
  const launchNotificationLabel = businessData.interested_in_tier
    ? `${businessData.interested_in_tier === 'pro' ? 'Pro tier' : 'AI tier'}`
    : 'None'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <OnboardingProgress
        hasGoogleLink={!!(businessData.google_review_url && businessData.google_review_url.trim())}
        hasFacebookLink={!!(businessData.facebook_review_url && businessData.facebook_review_url.trim())}
        hasCustomColor={!!hasCustomColor}
        hasEditedTemplates={!businessData.skip_template_choice}
      />
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

        {/* Migration Warning */}
        {migrationWarning && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-amber-800 text-sm">{migrationWarning}</p>
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

          {/* Plan & Billing */}
          <div id="plan-billing" className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Plan &amp; Billing</h2>
            <p className="text-gray-600 text-sm mb-6">
              See your current plan and control launch notifications for upcoming Pro &amp; AI tiers.
            </p>

            <div className="space-y-2 mb-6">
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Current Plan:</span>{' '}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold tracking-wide uppercase"
                  style={{
                    backgroundColor: '#F5F5DC',
                    borderColor: '#C9A961',
                    color: '#4A3428',
                  }}
                >
                  {currentPlanLabel === 'Pro'
                    ? 'PRO PLAN'
                    : currentPlanLabel === 'AI'
                    ? 'AI PLAN'
                    : 'FREE PLAN'}
                </span>
              </p>
              <p className="text-sm text-gray-800">
                <span className="font-semibold">Launch Notification:</span>{' '}
                <span className="text-gray-700">{launchNotificationLabel}</span>
              </p>
              {businessData.launch_discount_eligible && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 inline-block">
                  You qualify for <span className="font-semibold">50% off</span> the first 3 months
                  when Pro or AI launch in May 2026.
                </p>
              )}
            </div>

            <p className="text-sm text-gray-800 mb-4">
              Interested in upgrading when Pro or AI launch?
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handlePlanPreferenceClick('pro')}
                disabled={planSaving}
                className="px-4 py-2.5 bg-[#4A3428] text-white rounded-lg text-sm font-semibold hover:bg-[#4A3428]/90 transition-colors disabled:opacity-60"
              >
                Get notified when Pro launches
              </button>
              <button
                type="button"
                onClick={() => handlePlanPreferenceClick('ai')}
                disabled={planSaving}
                className="px-4 py-2.5 border border-[#C9A961] bg-[#F5F5DC]/70 text-[#4A3428] rounded-lg text-sm font-semibold hover:bg-[#F5F5DC] transition-colors disabled:opacity-60"
              >
                Get notified when AI launches
              </button>
              <button
                type="button"
                onClick={() => handlePlanPreferenceClick(null)}
                disabled={planSaving}
                className="px-4 py-2.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                I&apos;m happy with Free
              </button>
            </div>
            {planMessage && (
              <p className="mt-3 text-sm text-emerald-700 font-medium">{planMessage}</p>
            )}
            {planError && (
              <p className="mt-3 text-sm text-red-600 font-medium">{planError}</p>
            )}
          </div>

          {/* Review Platform URLs Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Platform URLs</h2>
            <p className="text-gray-600 mb-6">
              Add the URLs where customers can leave reviews for your business
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Not sure how to find these? Check the setup guide in the bottom-right corner, or{' '}
              <a href="mailto:jeremy@usereviewflo.com" className="text-blue-600 hover:underline">email me</a> and I can help.
            </p>

            <div className="space-y-6">
              {/* Google Business Profile Connection - Pro/AI only */}
              {canAccessGoogleStats(businessData.tier) && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Google Business Profile Integration
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Connect your Google Business Profile to automatically fetch your Place ID and enable dashboard stats. Works for all businesses, including service-area businesses!
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || 'YOUR_CLIENT_ID';
                    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
                    const scope = 'https://www.googleapis.com/auth/business.manage';
                    const state = session.access_token; // Pass session token as state

                    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}&access_type=offline&prompt=consent`;

                    window.location.href = authUrl;
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Connect Google Business Profile
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Or manually enter your Place ID below if you prefer.
                </p>
              </div>
              )}

              {/* Google Place ID - Pro/AI only, optional manual override */}
              {canAccessGoogleStats(businessData.tier) && (
              <div>
                <label htmlFor="googlePlaceId" className="block text-sm font-semibold text-gray-700 mb-2">
                  Google Place ID <span className="text-gray-500 font-normal">(optional - manual entry)</span>
                </label>
                <input
                  type="text"
                  id="googlePlaceId"
                  value={businessData.google_place_id || ''}
                  onChange={(e) => setBusinessData({ ...businessData, google_place_id: e.target.value || null })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="ChIJ..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only needed if the automatic connection above doesn't work. Get it from <a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Place ID Finder</a>.
                </p>
              </div>
              )}

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
                <ol className="text-xs text-gray-500 mt-1 list-decimal list-inside space-y-0.5">
                  <li>Log into Google Business Profile</li>
                  <li>Search your business</li>
                  <li>Click &quot;Get more reviews&quot;</li>
                  <li>Copy the link that appears</li>
                </ol>
              </div>

              {/* Facebook Review URL - Pro only */}
              {canAccessMultiPlatform(businessData.tier) && (
              <div>
                <label htmlFor="facebookUrl" className="block text-sm font-semibold text-gray-700 mb-2">
                  Facebook Review URL (Pro)
                </label>
                <input
                  type="url"
                  id="facebookUrl"
                  value={businessData.facebook_review_url || ''}
                  onChange={(e) => setBusinessData({ ...businessData, facebook_review_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="https://www.facebook.com/your-page/reviews"
                />
                <ol className="text-xs text-gray-500 mt-1 list-decimal list-inside space-y-0.5">
                  <li>Go to your Facebook Page</li>
                  <li>Copy the page URL</li>
                  <li>Add <code className="bg-gray-100 px-1 rounded">/reviews</code> to the end</li>
                </ol>
              </div>
              )}

              {/* Yelp Review URL - Pro only */}
              {canAccessMultiPlatform(businessData.tier) && (
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
              )}

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

          {/* Branding Settings - Pro only */}
          {canRemoveBranding(businessData.tier) && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Branding Settings (Pro)</h2>
            <p className="text-gray-600 mb-6">Control whether &quot;Powered by ReviewFlo&quot; appears on customer-facing pages.</p>
            <div className="flex items-center justify-between gap-6 py-4">
              <div>
                <label htmlFor="showBranding" className="text-sm font-semibold text-gray-900">
                  Show &quot;Powered by ReviewFlo&quot;
                </label>
                <p className="text-sm text-gray-500 mt-1">
                  When disabled, your review pages won&apos;t show ReviewFlo branding.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                id="showBranding"
                aria-checked={businessData.show_reviewflo_branding}
                onClick={() => setBusinessData({ ...businessData, show_reviewflo_branding: !businessData.show_reviewflo_branding })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  businessData.show_reviewflo_branding ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    businessData.show_reviewflo_branding ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                  aria-hidden
                />
              </button>
            </div>
          </div>
          )}

          {/* Review Flow Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Flow</h2>
            <p className="text-gray-600 mb-6">
              Control how customers leave reviews after giving 5 stars
            </p>
            <div className="flex items-center justify-between gap-6 py-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="includeTemplateChoice" className="text-sm font-semibold text-gray-900">
                    Enable templates
                  </label>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Give your customers the choice between writing their own review or choosing from templates. Disabling templates sends customers directly to your public review link.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                id="includeTemplateChoice"
                aria-checked={!businessData.skip_template_choice}
                onClick={() => setBusinessData({ ...businessData, skip_template_choice: !businessData.skip_template_choice })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  !businessData.skip_template_choice ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    !businessData.skip_template_choice ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                  aria-hidden
                />
              </button>
            </div>
          </div>

          {/* Review Templates Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Review Templates
              {getTemplateSlots(businessData.tier) === 1 && (
                <span className="ml-2 text-sm font-normal text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                  Free: 1 template
                </span>
              )}
            </h2>
            <p className="text-gray-600 mb-6">
              Create generic review templates that customers can copy and paste when leaving reviews
            </p>

            <div className="space-y-6">
              {templates.slice(0, getTemplateSlots(businessData.tier)).map((template, index) => (
                <div key={template.platform}>
                  <label
                    htmlFor={`template-${template.platform}`}
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Template {index + 1}
                  </label>
                  <textarea
                    id={`template-${template.platform}`}
                    value={template.template_text}
                    onChange={(e) => {
                      const newTemplates = [...templates]
                      newTemplates[index] = { ...newTemplates[index], template_text: e.target.value }
                      setTemplates(newTemplates)
                    }}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                    placeholder={`Enter review template ${index + 1}...`}
                  />
                </div>
              ))}
            </div>
            {getTemplateSlots(businessData.tier) === 1 && (
              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Want 3 professional templates?{' '}
                  <Link href="/#pricing" className="font-semibold text-amber-900 hover:underline">
                    Upgrade to Pro →
                  </Link>
                </p>
              </div>
            )}
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
