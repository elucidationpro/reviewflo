import { GetServerSideProps } from 'next'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import ReviewFloFooter from '../../components/ReviewFloFooter'
import { trackEvent } from '../../lib/posthog-provider'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
  google_review_url?: string
  facebook_review_url?: string
  yelp_review_url?: string
  nextdoor_review_url?: string
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
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = async (templateId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(templateId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      alert('Failed to copy text. Please try again.')
    }
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          {/* Business Name */}
          <h1
            className="text-3xl md:text-4xl font-bold text-center mb-4"
            style={{ color: business.primary_color }}
          >
            {business.business_name}
          </h1>

          {/* Thank You Message */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-8 h-8 md:w-10 md:h-10"
                  fill={business.primary_color}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ))}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Thank You for Your 5-Star Rating!
            </h2>
            <p className="text-gray-600 text-lg">
              We&apos;re thrilled you had a great experience! Would you mind sharing it online?
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
            How to Leave Your Review
          </h3>
          <p className="text-gray-600 text-sm md:text-base mb-6 text-center max-w-2xl mx-auto">
            <strong>Copy a template below or write your own</strong> review when you open Google, Facebook, Yelp, or
            Nextdoor.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold text-xl"
                style={{ backgroundColor: business.primary_color }}
              >
                1
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Copy a Template</h4>
              <p className="text-gray-600 text-sm">
                Copy one of the templates below, or write your own review in your own words
              </p>
            </div>
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold text-xl"
                style={{ backgroundColor: business.primary_color }}
              >
                2
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Click a Platform</h4>
              <p className="text-gray-600 text-sm">
                Select your preferred review platform below
              </p>
            </div>
            <div className="text-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-white font-bold text-xl"
                style={{ backgroundColor: business.primary_color }}
              >
                3
              </div>
              <h4 className="font-semibold text-gray-800 mb-2">Paste & Submit</h4>
              <p className="text-gray-600 text-sm">
                Paste your review and submit it on the platform
              </p>
            </div>
          </div>
        </div>

        {/* Review Templates */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Review Templates
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Copy a template to get started, or just click a platform below and write your own review.
          </p>
          {templates.length > 0 ? (
            <div className="space-y-4">
              {templates.map((template, index) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-700">
                      Template {index + 1}
                    </h4>
                    <button
                      onClick={() => handleCopy(template.id, template.template_text)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:shadow-md"
                      style={{
                        backgroundColor: copiedId === template.id ? '#10B981' : business.primary_color
                      }}
                    >
                      {copiedId === template.id ? (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {template.template_text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No templates available at this time.
            </p>
          )}
        </div>

        {/* Platform Links */}
        {platforms.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
              Choose Your Platform
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {platforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    // EVENT 5: Track when 5-star customer clicks through to Google review
                    if (platform.name === 'Google') {
                      trackEvent('five_star_to_google', {
                        businessId: business.id,
                        businessName: business.business_name,
                      })
                    }
                  }}
                  className="flex flex-col items-center justify-center p-6 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
                  style={{
                    borderColor: 'transparent',
                    backgroundColor: platform.color + '10'
                  }}
                >
                  <div className="mb-3 transform group-hover:scale-110 transition-transform">
                    {platform.icon}
                  </div>
                  <span className="font-semibold text-gray-800">
                    {platform.name}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm space-y-2">
          <div className="flex items-center justify-center gap-4">
            <Link href="/terms" className="hover:text-gray-600 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link href="/terms#privacy" className="hover:text-gray-600 transition-colors">
              Privacy Policy
            </Link>
          </div>
          <ReviewFloFooter />
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }

  // Fetch business data from Supabase
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, business_name, slug, primary_color, google_review_url, facebook_review_url, yelp_review_url, nextdoor_review_url')
    .eq('slug', slug)
    .single()

  if (businessError || !business) {
    return {
      notFound: true,
    }
  }

  // Fetch review templates for this business
  const { data: templates } = await supabase
    .from('review_templates')
    .select('id, template_text, platform')
    .eq('business_id', business.id)
    .order('platform', { ascending: true })

  return {
    props: {
      business,
      templates: templates || [],
    },
  }
}
