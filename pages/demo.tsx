'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Head from 'next/head'
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'
import ReviewPreview from '@/components/ReviewPreview'
import { getDefaultReviewTemplates } from '@/lib/default-review-templates'

const DEMO_PLACEHOLDER_URLS = {
  google: 'https://www.google.com/maps',
  facebook: 'https://www.facebook.com',
  yelp: 'https://www.yelp.com',
} as const

export default function DemoPage() {
  const [businessName, setBusinessName] = useState('Your Business')
  const [primaryColor, setPrimaryColor] = useState('#4A3428')
  const [showBusinessName, setShowBusinessName] = useState(true)
  const [useDefaultTemplates, setUseDefaultTemplates] = useState(true)
  const [whiteLabelDemo, setWhiteLabelDemo] = useState(false)
  const [whiteLabelBrandName, setWhiteLabelBrandName] = useState('')
  const [whiteLabelBrandColor, setWhiteLabelBrandColor] = useState('#C9A961')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const logoObjectUrlRef = useRef<string | null>(null)

  const templates = useMemo(
    () => (useDefaultTemplates ? getDefaultReviewTemplates(businessName) : []),
    [useDefaultTemplates, businessName]
  )

  const previewKey = useMemo(
    () =>
      [
        businessName,
        primaryColor,
        showBusinessName,
        useDefaultTemplates,
        logoUrl ?? '',
        whiteLabelDemo,
        whiteLabelBrandName,
        whiteLabelBrandColor,
      ].join('|'),
    [
      businessName,
      primaryColor,
      showBusinessName,
      useDefaultTemplates,
      logoUrl,
      whiteLabelDemo,
      whiteLabelBrandName,
      whiteLabelBrandColor,
    ]
  )

  const onLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current)
      logoObjectUrlRef.current = null
    }
    if (!file) {
      setLogoUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    logoObjectUrlRef.current = url
    setLogoUrl(url)
  }, [])

  const clearLogo = useCallback(() => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current)
      logoObjectUrlRef.current = null
    }
    setLogoUrl(null)
  }, [])

  useEffect(() => {
    return () => {
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current)
      }
    }
  }, [])

  return (
    <>
      <Head>
        <title>Try the review flow — ReviewFlo</title>
        <meta
          name="description"
          content="See how your customers experience ReviewFlo: stars, optional templates, and review links."
        />
        <meta name="robots" content="index, follow" />
      </Head>

      <SiteNav variant="demo" />

      <div className={`${SITE_NAV_SPACER_CLASS}`} aria-hidden />

      <main className="min-h-[calc(100dvh-5rem)] bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Interactive demo</h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Add your business name and logo, then try the same flow your customers see after a job — stars,
              optional review templates, and Google, Facebook, and Yelp. Nothing is saved.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            <section className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-5">
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Your details</h2>

                <div>
                  <label htmlFor="demo-business-name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Business name
                  </label>
                  <input
                    id="demo-business-name"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Smith Plumbing"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A961]/50"
                  />
                </div>

                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-1.5">Logo (optional)</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                      Upload image
                      <input type="file" accept="image/*" className="sr-only" onChange={onLogoChange} />
                    </label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="text-sm text-gray-500 hover:text-gray-800 underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">PNG, JPG, or SVG. Shown only in your browser.</p>
                </div>

                <div>
                  <label htmlFor="demo-primary-color" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Accent color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="demo-primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-14 rounded-lg border border-gray-200 cursor-pointer bg-white"
                      aria-label="Choose accent color"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono text-gray-800"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <span className="text-sm font-medium text-gray-800">Show business name</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={showBusinessName}
                      onClick={() => setShowBusinessName((v) => !v)}
                      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                        showBusinessName ? 'bg-[#4A3428]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-1 ${
                          showBusinessName ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>

                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div>
                      <span className="text-sm font-medium text-gray-800 block">Default review templates</span>
                      <span className="text-xs text-gray-500">Pre-written copy with your business name filled in</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={useDefaultTemplates}
                      onClick={() => setUseDefaultTemplates((v) => !v)}
                      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                        useDefaultTemplates ? 'bg-[#4A3428]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-1 ${
                          useDefaultTemplates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>

                  <div className="border-t border-gray-100 pt-5 space-y-3">
                    <label className="flex items-center justify-between gap-4 cursor-pointer">
                      <div>
                        <span className="text-sm font-medium text-gray-800 block">White-label footer</span>
                        <span className="text-xs text-gray-500">
                          Preview “Powered by your brand” instead of ReviewFlo (AI tier on real pages)
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={whiteLabelDemo}
                        onClick={() => setWhiteLabelDemo((v) => !v)}
                        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
                          whiteLabelDemo ? 'bg-[#4A3428]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-1 ${
                            whiteLabelDemo ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </label>
                    {whiteLabelDemo && (
                      <>
                        <div>
                          <label htmlFor="demo-wl-name" className="block text-xs font-medium text-gray-600 mb-1">
                            Brand name in footer
                          </label>
                          <input
                            id="demo-wl-name"
                            type="text"
                            value={whiteLabelBrandName}
                            onChange={(e) => setWhiteLabelBrandName(e.target.value)}
                            placeholder={businessName.trim() || 'Your Business'}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400"
                          />
                        </div>
                        <div>
                          <label htmlFor="demo-wl-color" className="block text-xs font-medium text-gray-600 mb-1">
                            Footer / accent color
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id="demo-wl-color"
                              type="color"
                              value={/^#[0-9A-Fa-f]{6}$/i.test(whiteLabelBrandColor) ? whiteLabelBrandColor : '#C9A961'}
                              onChange={(e) => setWhiteLabelBrandColor(e.target.value)}
                              className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer bg-white"
                              aria-label="White-label color"
                            />
                            <input
                              type="text"
                              value={whiteLabelBrandColor}
                              onChange={(e) => setWhiteLabelBrandColor(e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 px-1">
                Demo links for Google, Facebook, and Yelp are shown as examples — they don&apos;t leave this page in
                preview mode.
              </p>
            </section>

            <section className="lg:col-span-7">
              <ReviewPreview
                key={previewKey}
                businessName={businessName.trim() || 'Your Business'}
                primaryColor={primaryColor}
                logoUrl={logoUrl}
                showBusinessName={showBusinessName}
                showReviewfloBranding={!whiteLabelDemo}
                whiteLabelEnabled={whiteLabelDemo}
                whiteLabelBrandName={whiteLabelBrandName.trim() || null}
                whiteLabelBrandColor={whiteLabelDemo ? whiteLabelBrandColor : null}
                googleReviewUrl={DEMO_PLACEHOLDER_URLS.google}
                facebookReviewUrl={DEMO_PLACEHOLDER_URLS.facebook}
                yelpReviewUrl={DEMO_PLACEHOLDER_URLS.yelp}
                nextdoorReviewUrl={null}
                skipTemplateChoice
                templates={templates}
              />
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
