import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import OnboardingProgress from '../components/OnboardingProgress'
import { trackEvent } from '../lib/posthog-provider'
import { canAccessMultiPlatform, canRemoveBranding, getTemplateSlots, canAccessGoogleStats, canUseWhiteLabel } from '../lib/tier-permissions'
import AppLayout from '@/components/AppLayout'
import ReviewPreview from '@/components/ReviewPreview'

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
  show_business_name: boolean
  google_place_id: string | null
  white_label_enabled?: boolean
  custom_logo_url?: string | null
  custom_brand_name?: string | null
}

interface ReviewTemplate {
  id: string
  template_text: string
  platform: 'google' | 'facebook' | 'yelp'
}

// ── Help tooltip ────────────────────────────────────────────────────────────
function HelpTip({ content }: { content: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <span ref={ref} className="relative inline-flex items-center ml-1.5 align-middle">
      <button
        type="button"
        aria-label="More information"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center hover:bg-gray-300 transition-colors cursor-pointer select-none"
      >
        ?
      </button>
      {open && (
        <div className="absolute z-30 bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-2xl leading-relaxed">
          {content}
          <div className="absolute top-full left-3 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  )
}

// ── Field wrapper ────────────────────────────────────────────────────────────
function Field({
  label,
  htmlFor,
  help,
  children,
}: {
  label: string
  htmlFor?: string
  help?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-center text-sm font-semibold text-gray-700">
        {label}
        {help && <HelpTip content={help} />}
      </label>
      {children}
    </div>
  )
}

// ── Logo upload ─────────────────────────────────────────────────────────────
const LOGO_REQUIREMENTS = {
  formats: 'PNG, JPG, SVG, or WebP',
  maxSize: '2 MB',
  recommended: 'Square (400×400px) or landscape (600×200px). Transparent PNG works best.',
}

function LogoUpload({
  logoUrl,
  businessId,
  onUploaded,
  disabled,
}: {
  logoUrl: string | null
  businessId: string
  onUploaded: (url: string) => void
  disabled?: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !businessId) return
    e.target.value = ''

    setUploadError('')
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowed.includes(file.type)) {
      setUploadError(`Invalid format. Use ${LOGO_REQUIREMENTS.formats}.`)
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(`File too large. Max ${LOGO_REQUIREMENTS.maxSize}.`)
      return
    }

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        const dataUrl = reader.result as string
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setUploadError('Session expired. Please log in again.')
          setUploading(false)
          return
        }
        const res = await fetch('/api/upload-logo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            businessId,
            dataUrl,
            mimeType: file.type,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setUploadError(data?.error || 'Upload failed.')
          setUploading(false)
          return
        }
        onUploaded(data.url)
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      setUploadError('Upload failed. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <div className="flex flex-col items-start gap-2">
            <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
                className="text-xs font-semibold text-[#4A3428] hover:text-[#4A3428]/80 disabled:opacity-50 cursor-pointer"
              >
                {uploading ? 'Uploading…' : 'Replace'}
              </button>
              <button
                type="button"
                onClick={() => onUploaded('')}
                disabled={disabled || uploading}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50 cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label
            className={`
              flex flex-col items-center justify-center w-20 h-20 rounded-lg border-2 border-dashed cursor-pointer
              transition-colors shrink-0
              ${disabled || uploading
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                : 'border-gray-300 bg-white hover:border-[#C9A961] hover:bg-[#F5F5DC]/30'
              }
            `}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={disabled || uploading}
            />
            {uploading ? (
              <span className="text-xs text-gray-500">Uploading…</span>
            ) : (
              <span className="text-2xl text-gray-400">+</span>
            )}
          </label>
        )}
      </div>
      <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 text-xs text-gray-600 space-y-1">
        <p className="font-semibold text-gray-700">Requirements:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Formats: {LOGO_REQUIREMENTS.formats}</li>
          <li>Max size: {LOGO_REQUIREMENTS.maxSize}</li>
          <li>{LOGO_REQUIREMENTS.recommended}</li>
        </ul>
      </div>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
    </div>
  )
}

// ── Section card ─────────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-900 mb-5">{title}</h2>
      {children}
    </div>
  )
}

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
  badge,
}: {
  id: string
  checked: boolean
  onChange: () => void
  label: string
  description?: string
  badge?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">{label}</span>
          {badge}
        </div>
        {description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:ring-offset-2 ${
          checked ? 'bg-[#4A3428]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
          aria-hidden
        />
      </button>
    </div>
  )
}

// ── Input ────────────────────────────────────────────────────────────────────
const inputCls =
  'w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A961] focus:border-transparent transition'

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
  const [showManualGoogle, setShowManualGoogle] = useState(false)
  const [activeSection, setActiveSection] = useState<'branding' | 'links' | 'flow' | 'plan' | 'sms' | 'crm' | 'ai-features'>('branding')

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
    show_business_name: true,
    google_place_id: null,
    white_label_enabled: false,
    custom_logo_url: '',
    custom_brand_name: '',
  })

  const [templates, setTemplates] = useState<ReviewTemplate[]>([
    { id: '', template_text: '', platform: 'google' },
    { id: '', template_text: '', platform: 'facebook' },
    { id: '', template_text: '', platform: 'yelp' },
  ])

  useEffect(() => {
    const success = router.query.success
    const queryError = router.query.error
    if (typeof success === 'string') {
      setShowSuccess(true)
      setError('')
      setTimeout(() => setShowSuccess(false), 5000)
      router.replace('/settings', undefined, { shallow: true })
      return
    }
    if (typeof queryError === 'string') {
      setError(decodeURIComponent(queryError))
      router.replace('/settings', undefined, { shallow: true })
    }
  }, [router, router.query.error, router.query.success])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

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
          show_business_name: business.show_business_name ?? true,
          google_place_id: business.google_place_id || null,
          white_label_enabled: business.white_label_enabled ?? false,
          custom_logo_url: business.custom_logo_url || '',
          custom_brand_name: business.custom_brand_name || '',
        })

        if (business.google_review_url) setShowManualGoogle(true)

        const { data: templatesData, error: templatesError } = await supabase
          .from('review_templates')
          .select('id, template_text, platform')
          .eq('business_id', business.id)
          .order('platform', { ascending: true })

        if (!templatesError && templatesData && templatesData.length > 0) {
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setPlanError('Session expired. Please log in again.')
        setPlanSaving(false)
        return
      }

      const res = await fetch('/api/update-launch-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ businessId: businessData.id, interestedInTier: tier, notifyOnLaunch: tier !== null }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPlanError(data?.error || 'Failed to update. Please try again.')
        setPlanSaving(false)
        return
      }

      const updatedTier = (data?.interested_in_tier ?? tier) as 'pro' | 'ai' | null
      setBusinessData(prev => ({
        ...prev,
        interested_in_tier: updatedTier,
        notify_on_launch: data?.notify_on_launch ?? (tier !== null),
      }))

      if (tier) {
        setPlanMessage(`We'll email you when ${tier === 'pro' ? 'Pro' : 'AI'} launches in May 2026.`)
        trackEvent('upgrade_notification_requested', { tier, source: 'settings' })
      } else {
        setPlanMessage("Got it — we'll keep you on Free.")
      }
    } catch (err) {
      console.error('Error updating launch preference:', err)
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
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
          showBusinessName: businessData.show_business_name,
          googlePlaceId: businessData.google_place_id || null,
          whiteLabelEnabled: businessData.white_label_enabled,
          customBrandName: businessData.custom_brand_name || null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to save settings')
        setError(msg)
        setIsSaving(false)
        return
      }

      if (data.templateSettingSkipped) {
        setMigrationWarning(data.message || 'The template choice option requires a database migration.')
      }

      for (const template of templates) {
        if (template.id) {
          const { error: templateError } = await supabase
            .from('review_templates')
            .update({ template_text: template.template_text })
            .eq('id', template.id)
          if (templateError) console.error('Error updating template:', templateError)
        } else if (template.template_text) {
          const { error: templateError } = await supabase
            .from('review_templates')
            .insert({ business_id: businessData.id, platform: template.platform, template_text: template.template_text })
          if (templateError) console.error('Error creating template:', templateError)
        }
      }

      setShowSuccess(true)
      setIsSaving(false)
      setTimeout(() => { setShowSuccess(false); setMigrationWarning('') }, 6000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('An unexpected error occurred')
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F5DC]/40 to-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4A3428] mx-auto" />
          <p className="text-gray-500 mt-4 text-sm">Loading settings…</p>
        </div>
      </div>
    )
  }

  const hasCustomColor = businessData.primary_color && businessData.primary_color !== '#3B82F6'
  const currentPlanLabel = businessData.tier === 'pro' ? 'Pro' : businessData.tier === 'ai' ? 'AI' : 'Free'

  const NAV = [
    {
      id: 'branding' as const,
      label: 'Branding',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      id: 'links' as const,
      label: 'Review Links',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      id: 'flow' as const,
      label: 'Review Flow',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    ...(businessData.tier === 'ai' ? [
      {
        id: 'sms' as const,
        label: 'SMS Automation',
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        ),
      },
      {
        id: 'crm' as const,
        label: 'CRM Integration',
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        id: 'ai-features' as const,
        label: 'AI Features',
        icon: (
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        ),
      }
    ] : []),
    {
      id: 'plan' as const,
      label: 'Plan',
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
  ]

  const sidebarNav = (
    <>
      {NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setActiveSection(item.id)}
          className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
            activeSection === item.id
              ? 'bg-[#4A3428]/[0.07] text-[#4A3428] font-semibold'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </>
  )

  return (
    <AppLayout
      businessName={businessData.business_name}
      tier={businessData.tier}
      pendingFeedbackCount={0}
      onLogout={handleLogout}
      navExtra={sidebarNav}
    >
      <OnboardingProgress
        businessId={businessData.id}
        tier={businessData.tier}
        hasGoogleLink={!!(businessData.google_review_url && businessData.google_review_url.trim())}
        hasFacebookLink={!!(businessData.facebook_review_url && businessData.facebook_review_url.trim())}
        hasCustomColor={!!hasCustomColor}
        hasEditedTemplates={!businessData.skip_template_choice}
      />

      <div className="px-6 py-8">

        {/* Page title */}
        <div className="mb-6 max-w-2xl xl:max-w-none mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* Mobile section tabs — visible only when sidebar is hidden */}
        <div className="md:hidden mb-5 flex gap-1.5 overflow-x-auto pb-0.5">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeSection === item.id
                  ? 'bg-[#4A3428] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Content + preview — 50/50 split, preview fixed on right half */}
        <div className="flex gap-6 max-w-2xl xl:max-w-none mx-auto">

          {/* ── Section content ── */}
          <div className="flex-1 min-w-0">

            {/* Alerts */}
            {migrationWarning && (
              <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                {migrationWarning}
              </div>
            )}
            {error && (
              <div className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">

              {/* ══ BRANDING ══ */}
              {activeSection === 'branding' && (
                <>
                  <Card title="Business Identity">
                    <div className="space-y-4">
                      <Field label="Business Name" htmlFor="businessName">
                        <input
                          type="text"
                          id="businessName"
                          value={businessData.business_name}
                          onChange={(e) => setBusinessData({ ...businessData, business_name: e.target.value })}
                          className={inputCls}
                          required
                        />
                      </Field>

                      <Field
                        label="Brand Color"
                        htmlFor="primaryColor"
                        help="This color appears on buttons and accents on your customer-facing review pages."
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            id="primaryColor"
                            value={businessData.primary_color}
                            onChange={(e) => setBusinessData({ ...businessData, primary_color: e.target.value })}
                            className="h-10 w-16 border border-gray-200 rounded-lg cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            value={businessData.primary_color}
                            onChange={(e) => setBusinessData({ ...businessData, primary_color: e.target.value })}
                            className={inputCls}
                            placeholder="#3B82F6"
                          />
                        </div>
                      </Field>

                      <Field
                        label="Logo"
                        htmlFor="logoUpload"
                        help="Your logo appears at the top of your review pages. Upload an image file."
                      >
                        <LogoUpload
                          logoUrl={businessData.logo_url || null}
                          businessId={businessData.id}
                          onUploaded={(url) => setBusinessData({ ...businessData, logo_url: url || null })}
                          disabled={!businessData.id}
                        />
                      </Field>

                      {businessData.logo_url && (
                        <Toggle
                          id="showBusinessName"
                          checked={businessData.show_business_name}
                          onChange={() => setBusinessData({ ...businessData, show_business_name: !businessData.show_business_name })}
                          label="Show business name"
                          description="Display your business name on review pages. If your logo already includes your name, you can hide it here."
                        />
                      )}
                    </div>
                  </Card>

                  <Card title="ReviewFlo Branding">
                    <div className="space-y-4">
                      <Toggle
                        id="showBranding"
                        checked={businessData.show_reviewflo_branding}
                        onChange={() => {
                          if (canRemoveBranding(businessData.tier)) {
                            setBusinessData({ ...businessData, show_reviewflo_branding: !businessData.show_reviewflo_branding })
                          }
                        }}
                        label='Show "Powered by ReviewFlo"'
                        description={
                          canRemoveBranding(businessData.tier)
                            ? "When off, your review pages won't show ReviewFlo branding."
                            : "Upgrade to Pro to remove ReviewFlo branding from your review pages."
                        }
                        badge={
                          !canRemoveBranding(businessData.tier)
                            ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Pro</span>
                            : undefined
                        }
                      />
                      {canUseWhiteLabel(businessData.tier) && (
                        <>
                          <Toggle
                            id="whiteLabel"
                            checked={businessData.white_label_enabled ?? false}
                            onChange={() => setBusinessData({ ...businessData, white_label_enabled: !businessData.white_label_enabled })}
                            label="White-label mode"
                            description="Replace ReviewFlo branding entirely with your own brand when enabled."
                            badge={<span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[#C9A961]/20 text-[#4A3428]">AI</span>}
                          />
                          <Field
                            label="Custom brand name"
                            htmlFor="customBrandName"
                            help="Display name when white-label is on (defaults to your business name)."
                          >
                            <input
                              type="text"
                              id="customBrandName"
                              value={businessData.custom_brand_name || ''}
                              onChange={(e) => setBusinessData({ ...businessData, custom_brand_name: e.target.value })}
                              className={inputCls}
                              placeholder={businessData.business_name || 'Your business name'}
                            />
                          </Field>
                        </>
                      )}
                    </div>
                  </Card>
                </>
              )}

              {/* ══ REVIEW LINKS ══ */}
              {activeSection === 'links' && (
                <>
                  <Card title="Google Reviews">
                    {canAccessGoogleStats(businessData.tier) ? (
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={async () => {
                            const { data: { session } } = await supabase.auth.getSession()
                            if (!session) return
                            const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || 'YOUR_CLIENT_ID'
                            const redirectUri = `${window.location.origin}/api/auth/google/callback`
                            const scope = 'https://www.googleapis.com/auth/business.manage'
                            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(session.access_token)}&access_type=offline&prompt=consent`
                            window.location.href = authUrl
                          }}
                          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm cursor-pointer"
                        >
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                          Connect Google Business Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowManualGoogle(v => !v)}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                        >
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${showManualGoogle ? 'rotate-90' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Enter review link manually
                        </button>
                        {showManualGoogle && (
                          <Field
                            label="Google Review Link"
                            htmlFor="googleUrl"
                            help={
                              <>
                                <p className="mb-1 font-semibold">How to find your link:</p>
                                <ol className="list-decimal list-inside space-y-0.5">
                                  <li>Log into Google Business Profile</li>
                                  <li>Search your business name</li>
                                  <li>Click &quot;Get more reviews&quot;</li>
                                  <li>Copy the link that appears</li>
                                </ol>
                              </>
                            }
                          >
                            <input
                              type="url"
                              id="googleUrl"
                              value={businessData.google_review_url || ''}
                              onChange={(e) => setBusinessData({ ...businessData, google_review_url: e.target.value })}
                              className={inputCls}
                              placeholder="https://g.page/r/your-business/review"
                            />
                          </Field>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Field
                          label="Google Review Link"
                          htmlFor="googleUrl"
                          help={
                            <>
                              <p className="mb-1 font-semibold">How to find your link:</p>
                              <ol className="list-decimal list-inside space-y-0.5">
                                <li>Log into Google Business Profile</li>
                                <li>Search your business name</li>
                                <li>Click &quot;Get more reviews&quot;</li>
                                <li>Copy the link that appears</li>
                              </ol>
                            </>
                          }
                        >
                          <input
                            type="url"
                            id="googleUrl"
                            value={businessData.google_review_url || ''}
                            onChange={(e) => setBusinessData({ ...businessData, google_review_url: e.target.value })}
                            className={inputCls}
                            placeholder="https://g.page/r/your-business/review"
                          />
                        </Field>
                        <p className="text-xs text-gray-400">
                          Pro plan unlocks automatic Google Business Profile connection.
                        </p>
                      </div>
                    )}
                  </Card>

                  {canAccessMultiPlatform(businessData.tier) ? (
                    <Card title="Other Platforms">
                      <div className="space-y-4">
                        <Field
                          label="Facebook Reviews"
                          htmlFor="facebookUrl"
                          help={<>Go to your Facebook Page, copy the page URL, then add <code className="bg-white/10 px-1 rounded">/reviews</code> to the end.</>}
                        >
                          <input
                            type="url"
                            id="facebookUrl"
                            value={businessData.facebook_review_url || ''}
                            onChange={(e) => setBusinessData({ ...businessData, facebook_review_url: e.target.value })}
                            className={inputCls}
                            placeholder="https://www.facebook.com/your-page/reviews"
                          />
                        </Field>
                        <Field label="Yelp" htmlFor="yelpUrl">
                          <input
                            type="url"
                            id="yelpUrl"
                            value={businessData.yelp_review_url || ''}
                            onChange={(e) => setBusinessData({ ...businessData, yelp_review_url: e.target.value })}
                            className={inputCls}
                            placeholder="https://www.yelp.com/biz/your-business"
                          />
                        </Field>
                        <Field label="Nextdoor" htmlFor="nextdoorUrl">
                          <input
                            type="url"
                            id="nextdoorUrl"
                            value={businessData.nextdoor_review_url || ''}
                            onChange={(e) => setBusinessData({ ...businessData, nextdoor_review_url: e.target.value })}
                            className={inputCls}
                            placeholder="https://nextdoor.com/pages/your-business"
                          />
                        </Field>
                      </div>
                    </Card>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 mb-0.5">Facebook, Yelp &amp; Nextdoor</p>
                          <p className="text-xs text-gray-500 leading-relaxed">Add more review platforms with the Pro plan. Direct customers to the platform that matters most to your business.</p>
                          <Link href="/#pricing" className="inline-block mt-2.5 text-xs font-semibold text-[#4A3428] hover:underline">
                            Upgrade to Pro →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ══ REVIEW FLOW ══ */}
              {activeSection === 'flow' && (
                <>
                  <Card title="Flow Settings">
                    <Toggle
                      id="includeTemplateChoice"
                      checked={!businessData.skip_template_choice}
                      onChange={() => setBusinessData({ ...businessData, skip_template_choice: !businessData.skip_template_choice })}
                      label="Show review templates"
                      description="Customers can pick a pre-written template or write their own. Turning this off sends them straight to your Google link."
                      badge={
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Recommended
                        </span>
                      }
                    />
                  </Card>

                  <Card title={`Review Templates${getTemplateSlots(businessData.tier) === 1 ? ' (Free: 1 template)' : ''}`}>
                    <div className="space-y-4">
                      {templates.slice(0, getTemplateSlots(businessData.tier)).map((template, index) => (
                        <Field key={template.platform} label={`Template ${index + 1}`} htmlFor={`template-${template.platform}`}>
                          <textarea
                            id={`template-${template.platform}`}
                            value={template.template_text}
                            onChange={(e) => {
                              const newTemplates = [...templates]
                              newTemplates[index] = { ...newTemplates[index], template_text: e.target.value }
                              setTemplates(newTemplates)
                            }}
                            rows={3}
                            className={inputCls}
                            placeholder={`Template ${index + 1} — customers can copy and paste this when leaving a review`}
                          />
                        </Field>
                      ))}
                    </div>
                    {getTemplateSlots(businessData.tier) === 1 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-xs text-amber-800">
                          Want 3 templates?{' '}
                          <Link href="/#pricing" className="font-semibold hover:underline">Upgrade to Pro →</Link>
                        </p>
                      </div>
                    )}
                  </Card>
                </>
              )}

              {/* ══ SMS AUTOMATION (AI Tier) ══ */}
              {activeSection === 'sms' && (
                <>
                  <Card title="SMS Automation">
                    <div className="space-y-4">
                      <div className="p-4 bg-[#C9A961]/10 border border-[#C9A961]/30 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#C9A961]/20 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-[#4A3428]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">Feature Coming Soon</p>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              SMS automation will be available when the AI tier launches in May 2026. Send review requests via text message with Twilio integration.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Field
                        label="Enable SMS Requests"
                        help="When enabled, you can send review requests via SMS in addition to email."
                      >
                        <Toggle
                          id="smsEnabled"
                          checked={false}
                          onChange={() => {}}
                          label="SMS automation enabled"
                          description="Disabled until May 2026 launch"
                        />
                      </Field>

                      <Field
                        label="Twilio Phone Number"
                        htmlFor="twilioPhone"
                        help="Your Twilio phone number (format: +1234567890)"
                      >
                        <input
                          type="tel"
                          id="twilioPhone"
                          value=""
                          disabled
                          className={`${inputCls} opacity-50 cursor-not-allowed`}
                          placeholder="+1234567890"
                        />
                      </Field>

                      <Field
                        label="Twilio Account SID"
                        htmlFor="twilioSid"
                        help="Find this in your Twilio console dashboard"
                      >
                        <input
                          type="text"
                          id="twilioSid"
                          value=""
                          disabled
                          className={`${inputCls} opacity-50 cursor-not-allowed`}
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                      </Field>

                      <Field
                        label="Twilio Auth Token"
                        htmlFor="twilioToken"
                        help="Keep this secret. Never share with anyone."
                      >
                        <input
                          type="password"
                          id="twilioToken"
                          value=""
                          disabled
                          className={`${inputCls} opacity-50 cursor-not-allowed`}
                          placeholder="••••••••••••••••••••••••••••••••"
                        />
                      </Field>
                    </div>
                  </Card>
                </>
              )}

              {/* ══ CRM INTEGRATION (AI Tier) ══ */}
              {activeSection === 'crm' && (
                <>
                  <Card title="CRM Integrations">
                    <div className="space-y-4">
                      <div className="p-4 bg-[#C9A961]/10 border border-[#C9A961]/30 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#C9A961]/20 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-[#4A3428]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">Feature Coming Soon</p>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              CRM integrations will be available when the AI tier launches in May 2026. Automatically sync customers and trigger review requests from your CRM.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Square */}
                      <div className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M4.01 8.54C4.01 6.03 5.95 4 8.33 4c1.27 0 2.41.59 3.16 1.51l-1.46 1.46c-.4-.52-1.01-.84-1.7-.84-1.31 0-2.37 1.11-2.37 2.47 0 1.36 1.06 2.47 2.37 2.47.69 0 1.3-.32 1.7-.84l1.46 1.46A4.07 4.07 0 018.33 13c-2.38 0-4.32-2.03-4.32-4.46M13.44 4h1.87v9h-1.87zM20 8.54c0-1.31-1.06-2.37-2.37-2.37-.69 0-1.3.32-1.7.84l-1.46-1.46A4.07 4.07 0 0117.63 4c2.38 0 4.32 2.03 4.32 4.46S20.01 13 17.63 13a4.07 4.07 0 01-3.16-1.51l1.46-1.46c.4.52 1.01.84 1.7.84 1.31 0 2.37-1.11 2.37-2.47z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Square</p>
                              <p className="text-xs text-gray-500">Point of sale integration</p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                            Not Connected
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled
                          className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg text-sm font-semibold cursor-not-allowed"
                        >
                          Connect Square
                        </button>
                      </div>

                      {/* Jobber */}
                      <div className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                <rect x="4" y="4" width="7" height="7" rx="1"/>
                                <rect x="13" y="4" width="7" height="7" rx="1"/>
                                <rect x="4" y="13" width="7" height="7" rx="1"/>
                                <rect x="13" y="13" width="7" height="7" rx="1"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Jobber</p>
                              <p className="text-xs text-gray-500">Field service management</p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                            Not Connected
                          </span>
                        </div>
                        <Field
                          label="API Key"
                          htmlFor="jobberApiKey"
                          help="Get your API key from Jobber settings"
                        >
                          <input
                            type="password"
                            id="jobberApiKey"
                            value=""
                            disabled
                            className={`${inputCls} opacity-50 cursor-not-allowed`}
                            placeholder="Enter Jobber API key"
                          />
                        </Field>
                      </div>

                      {/* Housecall Pro */}
                      <div className="p-4 border border-gray-200 rounded-xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 3L4 9v11h5v-7h6v7h5V9l-8-6z"/>
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Housecall Pro</p>
                              <p className="text-xs text-gray-500">Home services software</p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full font-medium">
                            Not Connected
                          </span>
                        </div>
                        <Field
                          label="API Key"
                          htmlFor="housecallApiKey"
                          help="Get your API key from Housecall Pro settings"
                        >
                          <input
                            type="password"
                            id="housecallApiKey"
                            value=""
                            disabled
                            className={`${inputCls} opacity-50 cursor-not-allowed`}
                            placeholder="Enter Housecall Pro API key"
                          />
                        </Field>
                      </div>
                    </div>
                  </Card>
                </>
              )}

              {/* ══ AI FEATURES (AI Tier) ══ */}
              {activeSection === 'ai-features' && (
                <>
                  <Card title="AI-Powered Features">
                    <div className="space-y-4">
                      <div className="p-4 bg-[#C9A961]/10 border border-[#C9A961]/30 rounded-xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#C9A961]/20 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-[#4A3428]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-1">Feature Coming Soon</p>
                            <p className="text-xs text-gray-600 leading-relaxed">
                              AI features will be available when the AI tier launches in May 2026. Get AI-generated review drafts for customers and AI-powered responses to reviews.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Toggle
                        id="aiReviewDrafts"
                        checked={false}
                        onChange={() => {}}
                        label="AI Review Drafts"
                        description="Suggest AI-generated review text to customers based on keywords they select. Makes it easier for customers to leave detailed, positive reviews."
                      />

                      <Toggle
                        id="aiReviewResponses"
                        checked={false}
                        onChange={() => {}}
                        label="AI Review Responses"
                        description="Generate professional, personalized responses to customer reviews automatically. Review and edit before posting."
                      />

                      <Field
                        label="Response Tone"
                        htmlFor="responseTone"
                        help="How should AI-generated responses sound?"
                      >
                        <select
                          id="responseTone"
                          disabled
                          className={`${inputCls} opacity-50 cursor-not-allowed`}
                        >
                          <option>Professional</option>
                          <option>Friendly</option>
                          <option>Casual</option>
                          <option>Formal</option>
                        </select>
                      </Field>

                      <Field
                        label="Business Type"
                        htmlFor="businessType"
                        help="Helps AI understand your industry for better responses"
                      >
                        <input
                          type="text"
                          id="businessType"
                          value=""
                          disabled
                          className={`${inputCls} opacity-50 cursor-not-allowed`}
                          placeholder="e.g., HVAC, Plumbing, Landscaping, Auto Repair"
                        />
                      </Field>
                    </div>
                  </Card>
                </>
              )}

              {/* ══ PLAN ══ */}
              {activeSection === 'plan' && (
                <Card title="Plan & Billing">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Current plan</span>
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold tracking-wide uppercase"
                        style={{ backgroundColor: '#F5F5DC', borderColor: '#C9A961', color: '#4A3428' }}
                      >
                        {currentPlanLabel}
                      </span>
                    </div>
                    {businessData.launch_discount_eligible && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        You qualify for <span className="font-semibold">50% off</span> the first 3 months when Pro or AI launch in May 2026.
                      </p>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 mb-3">Get notified when paid plans launch:</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handlePlanPreferenceClick('pro')}
                          disabled={planSaving}
                          className="px-3.5 py-2 bg-[#4A3428] text-white rounded-lg text-xs font-semibold hover:bg-[#4A3428]/90 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          Notify me — Pro
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlanPreferenceClick('ai')}
                          disabled={planSaving}
                          className="px-3.5 py-2 border border-[#C9A961] bg-[#F5F5DC]/70 text-[#4A3428] rounded-lg text-xs font-semibold hover:bg-[#F5F5DC] transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          Notify me — AI
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePlanPreferenceClick(null)}
                          disabled={planSaving}
                          className="px-3.5 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          Stay on Free
                        </button>
                      </div>
                      {planMessage && <p className="mt-2.5 text-xs text-emerald-700 font-medium">{planMessage}</p>}
                      {planError && <p className="mt-2.5 text-xs text-red-600 font-medium">{planError}</p>}
                    </div>
                  </div>
                </Card>
              )}

              {/* Save / Back — hidden on Plan section */}
              {activeSection !== 'plan' && (
                <div className="flex flex-col gap-3 pt-2 pb-8">
                  {showSuccess && (
                    <div className="flex items-center gap-2.5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium">
                      <svg className="w-4 h-4 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Settings saved!
                    </div>
                  )}
                  <div className="flex justify-end gap-3">
                    <Link
                      href="/dashboard"
                      className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Back to Overview
                    </Link>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 bg-[#4A3428] text-white text-sm font-semibold rounded-lg hover:bg-[#4A3428]/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSaving ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving…
                        </span>
                      ) : (
                        'Save Settings'
                      )}
                    </button>
                  </div>
                </div>
              )}
              {activeSection === 'plan' && <div className="pb-8" />}

            </form>
          </div>{/* end section content */}

          {/* Spacer for 50/50 layout (preview overlays this area) */}
          <div className="hidden xl:block flex-1 min-w-0" aria-hidden />

          {/* ── Fixed live preview (xl+) — stays in view when scrolling, takes right half ── */}
          <div className="hidden xl:flex flex-col fixed top-6 left-[calc(7rem+50vw+0.5rem)] right-6 bottom-6 z-20 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 mb-2 px-1">Live Preview</p>
            <ReviewPreview
              businessName={businessData.business_name}
              primaryColor={businessData.primary_color}
              logoUrl={businessData.logo_url || null}
              showBusinessName={businessData.show_business_name}
              googleReviewUrl={businessData.google_review_url || null}
              facebookReviewUrl={businessData.facebook_review_url || null}
              yelpReviewUrl={businessData.yelp_review_url || null}
              nextdoorReviewUrl={businessData.nextdoor_review_url || null}
              skipTemplateChoice={businessData.skip_template_choice}
              showReviewfloBranding={businessData.show_reviewflo_branding}
              templates={templates}
            />
          </div>

        </div>{/* end main row */}
      </div>
    </AppLayout>
  )
}
