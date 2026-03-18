import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import Link from 'next/link'
import { PenLine, ClipboardList } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ReviewFloFooter from '../../components/ReviewFloFooter'
import { trackEvent } from '../../lib/posthog-provider'
import { getTemplateSlots } from '../../lib/tier-permissions'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
  skip_template_choice?: boolean
  google_review_url?: string
  facebook_review_url?: string
  yelp_review_url?: string
  nextdoor_review_url?: string
  tier?: 'free' | 'pro' | 'ai'
  show_reviewflo_branding?: boolean
}

interface ReviewTemplate {
  id: string
  template_text: string
  platform: 'google' | 'facebook' | 'yelp'
}

interface PageProps {
  business: Business
  templates: ReviewTemplate[]
}

export default function TemplatesPage({ business, templates }: PageProps) {
  const hasPlatformLinks = !!(business.google_review_url || business.facebook_review_url || business.yelp_review_url || business.nextdoor_review_url)
  const [reviewPath, setReviewPath] = useState<'write_own' | 'use_template' | null>(
    business.skip_template_choice && hasPlatformLinks ? 'write_own' : null
  )
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [copiedTemplate, setCopiedTemplate] = useState(false)
  const [clickedPlatform, setClickedPlatform] = useState<string | null>(null)

  const handleTemplateClick = (templateText: string, templateIndex: number) => {
    setSelectedTemplate(templateText)

    navigator.clipboard.writeText(templateText).then(() => {
      setCopiedTemplate(true)
      setTimeout(() => setCopiedTemplate(false), 5000)
    }).catch(err => {
      console.error('Failed to copy template:', err)
    })

    trackEvent('template_selected', {
      businessId: business.id,
      businessName: business.business_name,
      templateNumber: templateIndex + 1,
    })
  }

  const handlePlatformClick = (platformName: string, platformUrl: string, templateText?: string) => {
    setClickedPlatform(platformName)
    setTimeout(() => setClickedPlatform(null), 1500)

    trackEvent('platform_selected', {
      businessId: business.id,
      businessName: business.business_name,
      platform: platformName.toLowerCase(),
      reviewPath: reviewPath,
      templateUsed: !!templateText,
    })

    if (platformName === 'Google') {
      trackEvent('five_star_to_google', {
        businessId: business.id,
        businessName: business.business_name,
      })
    }

    window.open(platformUrl, '_blank')
  }

  const platforms = [
    {
      name: 'Google',
      url: business.google_review_url,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      ),
      color: '#4285F4'
    },
    {
      name: 'Facebook',
      url: business.facebook_review_url,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
        </svg>
      ),
      color: '#1877F2'
    },
    {
      name: 'Yelp',
      url: business.yelp_review_url,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.111 18.226c-.141.969-2.119 3.483-3.029 3.847-.311.124-.611.094-.85-.09-.154-.12-2.314-1.934-2.993-2.507-.625-.528-.79-1.198-.421-1.761.332-.505 2.219-3.003 2.219-3.003.445-.604 1.179-.68 1.718-.271 1.008.769 3.164 2.882 3.273 3.203.107.321.179.668.083 1.582zm-3.644-9.544c.127-.461 1.658-3.06 2.147-3.571.304-.317.666-.473 1.048-.484.424-.009.764.174 1.009.51.263.358.545 1.292.689 2.173.165 1.003-.149 1.682-.933 2.036-.742.335-3.006 1.263-3.006 1.263-.696.294-1.442.075-1.771-.551-.299-.567.573-2.111.817-2.376z" fill="#D32323"/>
        </svg>
      ),
      color: '#D32323'
    },
    {
      name: 'Nextdoor',
      url: business.nextdoor_review_url,
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" fill="#00B246"/>
          <path d="M12 7c-2.761 0-5 2.239-5 5s2.239 5 5 5 5-2.239 5-5-2.239-5-5-5zm0 8c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z" fill="#00B246"/>
        </svg>
      ),
      color: '#00B246'
    }
  ].filter(platform => platform.url)

  return (
    <>
      <Head>
        <title>{`${business.business_name} - Leave a Review`}</title>
        <meta name="description" content={`Thank you for your 5-star rating! Leave a review for ${business.business_name}.`} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-dvh bg-gray-50 px-4 py-8 sm:py-12">
        <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl mx-auto">

          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14 mb-4">

            {/* Business Name */}
            <h1
              className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-center tracking-tight mb-5"
              style={{ color: business.primary_color }}
            >
              {business.business_name}
            </h1>

            {/* 5-Star Celebration */}
            <div className="text-center mb-5 pb-5 border-b border-gray-100">
              <div className="flex justify-center gap-1.5 md:gap-2 lg:gap-2.5 xl:gap-3 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12"
                    fill={business.primary_color}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                ))}
              </div>
              <p className="font-semibold text-gray-900 md:text-lg lg:text-xl xl:text-2xl mb-0.5">
                Thanks for the 5-star rating!
              </p>
              <p className="text-gray-500 text-sm md:text-base lg:text-lg xl:text-xl">
                {business.skip_template_choice
                  ? 'Choose where to leave your review:'
                  : 'How would you like to leave your review?'}
              </p>
            </div>

            {/* STEP 1: Path Choice */}
            {!reviewPath && (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setReviewPath('write_own')
                    trackEvent('review_path_selected', {
                      businessId: business.id,
                      businessName: business.business_name,
                      path: 'write_own',
                    })
                  }}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full flex items-center gap-4 p-4 lg:p-5 xl:p-6 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 text-left cursor-pointer group"
                >
                  <div
                    className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${business.primary_color}18` }}
                  >
                    <PenLine className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: business.primary_color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm lg:text-base">Write your own</p>
                    <p className="text-gray-400 text-xs lg:text-sm">In your own words</p>
                  </div>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    setReviewPath('use_template')
                    trackEvent('review_path_selected', {
                      businessId: business.id,
                      businessName: business.business_name,
                      path: 'use_template',
                    })
                  }}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full flex items-center gap-4 p-4 lg:p-5 xl:p-6 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 text-left cursor-pointer group"
                >
                  <div
                    className="w-10 h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${business.primary_color}18` }}
                  >
                    <ClipboardList className="w-5 h-5 lg:w-6 lg:h-6" style={{ color: business.primary_color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm lg:text-base">Use a template</p>
                    <p className="text-gray-400 text-xs lg:text-sm">Quick pre-written option</p>
                  </div>
                  <svg className="w-4 h-4 lg:w-5 lg:h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {/* STEP 2A: Write Own — Platform Selection */}
            {reviewPath === 'write_own' && platforms.length > 0 && (
              <div>
                {!business.skip_template_choice && (
                  <button
                    onClick={() => setReviewPath(null)}
                    style={{ touchAction: 'manipulation' }}
                    className="mb-5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                )}

                <p className="text-sm font-semibold text-gray-700 mb-3">Choose a platform:</p>

                <div className="space-y-2.5">
                  {platforms.map((platform) => (
                    <button
                      key={platform.name}
                      onClick={() => handlePlatformClick(platform.name, platform.url!)}
                      disabled={clickedPlatform === platform.name}
                      style={{ touchAction: 'manipulation' }}
                      className="w-full flex items-center gap-4 px-4 py-3.5 lg:px-5 lg:py-4 xl:px-6 xl:py-5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 cursor-pointer disabled:cursor-default"
                    >
                      <div className="shrink-0">{platform.icon}</div>
                      <span className="flex-1 text-left font-medium text-gray-800 text-sm lg:text-base xl:text-lg">
                        {platform.name}
                      </span>
                      {clickedPlatform === platform.name ? (
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2B: Template Selection */}
            {reviewPath === 'use_template' && !selectedTemplate && templates.length > 0 && (
              <div>
                <button
                  onClick={() => setReviewPath(null)}
                  style={{ touchAction: 'manipulation' }}
                  className="mb-5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>

                <p className="text-sm font-semibold text-gray-700 mb-3">Choose a template:</p>

                <div className="space-y-2.5">
                  {templates.slice(0, getTemplateSlots(business.tier)).map((template, index) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateClick(template.template_text, index)}
                      style={{ touchAction: 'manipulation' }}
                      className="w-full border border-gray-100 rounded-xl p-4 lg:p-5 xl:p-6 hover:border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 text-left cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                          style={{ backgroundColor: business.primary_color }}
                        >
                          {index + 1}
                        </span>
                        <p className="text-gray-700 text-sm lg:text-base xl:text-lg leading-relaxed flex-1">
                          {template.template_text}
                        </p>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2B Continued: Platform after Template */}
            {reviewPath === 'use_template' && selectedTemplate && platforms.length > 0 && (
              <div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  style={{ touchAction: 'manipulation' }}
                  className="mb-5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Choose different template
                </button>

                {copiedTemplate && (
                  <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-emerald-800 text-sm font-medium">Template copied to clipboard</p>
                  </div>
                )}

                <p className="text-sm font-semibold text-gray-700 mb-3">Choose where to post:</p>

                <div className="space-y-2.5">
                  {platforms.map((platform) => (
                    <button
                      key={platform.name}
                      onClick={() => handlePlatformClick(platform.name, platform.url!, selectedTemplate)}
                      disabled={clickedPlatform === platform.name}
                      style={{ touchAction: 'manipulation' }}
                      className="w-full flex items-center gap-4 px-4 py-3.5 lg:px-5 lg:py-4 xl:px-6 xl:py-5 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 active:bg-gray-100 transition-all duration-150 cursor-pointer disabled:cursor-default"
                    >
                      <div className="shrink-0">{platform.icon}</div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-gray-800 text-sm lg:text-base xl:text-lg">{platform.name}</p>
                        {clickedPlatform === platform.name && (
                          <p className="text-xs text-emerald-600">Opening…</p>
                        )}
                      </div>
                      {clickedPlatform === platform.name ? (
                        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 text-xs text-gray-300 mb-1">
              <Link href="/terms" className="hover:text-gray-500 transition-colors">Terms</Link>
              <span>·</span>
              <Link href="/terms#privacy" className="hover:text-gray-500 transition-colors">Privacy</Link>
            </div>
            <ReviewFloFooter showBranding={business.show_reviewflo_branding !== false || business.tier === 'free'} />
          </div>

        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (businessError || !business) {
    return { notFound: true }
  }

  const businessWithSettings = {
    ...business,
    skip_template_choice: business.skip_template_choice ?? false,
  }

  const { data: templatesData } = await supabase
    .from('review_templates')
    .select('id, template_text, platform')
    .eq('business_id', business.id)

  const templates = templatesData ? [
    templatesData.find(t => t.platform === 'google'),
    templatesData.find(t => t.platform === 'facebook'),
    templatesData.find(t => t.platform === 'yelp'),
  ].filter(Boolean) : []

  return {
    props: {
      business: businessWithSettings,
      templates: templates || [],
    },
  }
}
