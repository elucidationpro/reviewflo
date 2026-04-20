import { GetServerSideProps } from 'next'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import ReviewFloFooter from '../../components/ReviewFloFooter'
import { trackEvent } from '../../lib/posthog-provider'
import { getReviewAccentColor, resolvePublicReviewFooter } from '../../lib/review-page-branding'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
  tier?: 'free' | 'pro' | 'ai'
  show_reviewflo_branding?: boolean
  show_business_name?: boolean
  logo_url?: string | null
  white_label_enabled?: boolean
  custom_brand_name?: string | null
  custom_brand_color?: string | null
}

interface PageProps {
  business: Business
  rating: number
}

function getDisplayLogoUrl(b: Business): string | null {
  return b.logo_url || null
}

export default function FeedbackPage({ business, rating }: PageProps) {
  const accentColor = getReviewAccentColor(business)
  const footer = resolvePublicReviewFooter(business)
  const displayLogoUrl = getDisplayLogoUrl(business)
  const [whatHappened, setWhatHappened] = useState('')
  const [howToMakeRight, setHowToMakeRight] = useState('')
  const [wantsContact, setWantsContact] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formError, setFormError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!whatHappened.trim() || !howToMakeRight.trim()) {
      setFormError('Please fill in both fields before submitting.')
      return
    }

    if (wantsContact && !email.trim() && !phone.trim()) {
      setFormError('Please provide an email or phone number so we can reach you.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          business_id: business.id,
          star_rating: rating,
          what_happened: whatHappened.trim(),
          how_to_make_right: howToMakeRight.trim(),
          wants_contact: wantsContact,
          email: wantsContact ? email.trim() || null : null,
          phone: wantsContact ? phone.trim() || null : null,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving feedback:', error)
        setFormError('Something went wrong. Please try again.')
        setIsSubmitting(false)
        return
      }

      trackEvent('private_feedback_submitted', {
        rating,
        businessId: business.id,
        businessName: business.business_name,
        feedbackLength: whatHappened.length + howToMakeRight.length,
        wantsContact,
      })

      try {
        await fetch('/api/send-feedback-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business.id,
            starRating: rating,
            whatHappened: whatHappened.trim(),
            howToMakeRight: howToMakeRight.trim(),
            wantsContact,
            email: wantsContact ? email.trim() || undefined : undefined,
            phone: wantsContact ? phone.trim() || undefined : undefined,
          }),
        })
      } catch (emailError) {
        console.error('Error sending email:', emailError)
      }

      setIsSubmitted(true)
    } catch (err) {
      console.error('Error submitting feedback:', err)
      setFormError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 px-4 py-10">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-xl xl:max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 lg:p-14 xl:p-16 text-center">
            {/* Logo */}
            {displayLogoUrl && (
              <div className="flex justify-center mb-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayLogoUrl}
                  alt={business.business_name}
                  className="max-h-24 md:max-h-28 w-auto object-contain"
                />
              </div>
            )}
            {/* Success Icon */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: `${accentColor}15` }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: accentColor }}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-gray-900 mb-2">
              Thank you for your feedback
            </h1>
            <p className="text-gray-500 text-sm lg:text-base xl:text-lg">
              {wantsContact
                ? "We'll be in touch soon to make things right."
                : 'We appreciate you taking the time to share your experience.'}
            </p>
          </div>

          {/* Footer */}
          <div className="mt-5 text-center">
            <div className="flex items-center justify-center gap-3 text-xs text-gray-300 mb-1">
              <Link href="/terms" className="hover:text-gray-500 transition-colors">Terms</Link>
              <span>·</span>
              <Link href="/terms#privacy" className="hover:text-gray-500 transition-colors">Privacy</Link>
            </div>
            <ReviewFloFooter whiteLabel={footer.whiteLabel} showBranding={footer.showReviewFloBranding} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-50 px-4 py-8 sm:py-12">
      <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl mx-auto">

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-10 lg:p-12 xl:p-14">
          {/* Logo */}
          {displayLogoUrl && (
            <div className="flex justify-center mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayLogoUrl}
                alt={business.business_name}
                className="max-h-28 md:max-h-36 w-auto object-contain"
              />
            </div>
          )}
          {/* Header — business name hidden if owner disabled it */}
          {business.show_business_name !== false && (
            <h1
              className="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-center tracking-tight mb-1"
              style={{ color: accentColor }}
            >
              {business.business_name}
            </h1>
          )}
          <p className="text-gray-400 text-sm md:text-base lg:text-lg text-center mb-6">
            We&apos;d like to understand what happened.
          </p>

          {/* Form Error */}
          {formError && (
            <div className="mb-4 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-red-700 text-sm">{formError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* What Happened */}
            <div>
              <label htmlFor="whatHappened" className="block text-sm lg:text-base font-semibold text-gray-700 mb-1.5">
                What happened?
              </label>
              <textarea
                id="whatHappened"
                value={whatHappened}
                onChange={(e) => setWhatHappened(e.target.value)}
                placeholder="Please describe your experience…"
                rows={4}
                className="w-full px-4 py-3 lg:py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent resize-none text-gray-900 placeholder-gray-300 text-sm lg:text-base"
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                required
              />
            </div>

            {/* How to Make Right */}
            <div>
              <label htmlFor="howToMakeRight" className="block text-sm lg:text-base font-semibold text-gray-700 mb-1.5">
                How can we make it right?
              </label>
              <textarea
                id="howToMakeRight"
                value={howToMakeRight}
                onChange={(e) => setHowToMakeRight(e.target.value)}
                placeholder="What would make this better for you…"
                rows={4}
                className="w-full px-4 py-3 lg:py-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent resize-none text-gray-900 placeholder-gray-300 text-sm lg:text-base"
                style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                required
              />
            </div>

            {/* Contact Checkbox */}
            <div className="pt-1 border-t border-gray-100">
              <label className="flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={wantsContact}
                  onChange={(e) => setWantsContact(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer shrink-0"
                  style={{ accentColor: accentColor }}
                />
                <span className="text-sm text-gray-700">
                  I&apos;d like to be contacted about this
                </span>
              </label>
            </div>

            {/* Conditional Contact Fields */}
            {wantsContact && (
              <div className="space-y-3 pl-7">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-600 mb-1">
                    Email <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder-gray-300 text-sm"
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-medium text-gray-600 mb-1">
                    Phone <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder-gray-300 text-sm"
                    style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  />
                </div>

                <p className="text-xs text-gray-400">Provide at least one contact method</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: accentColor,
                touchAction: 'manipulation',
              } as React.CSSProperties}
              className="w-full text-white font-semibold py-3.5 lg:py-4 px-6 text-sm lg:text-base rounded-xl transition-opacity duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:opacity-80 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting…
                </span>
              ) : (
                'Submit Feedback'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-5 text-center">
          <div className="flex items-center justify-center gap-3 text-xs text-gray-300 mb-1">
            <Link href="/terms" className="hover:text-gray-500 transition-colors">Terms</Link>
            <span>·</span>
            <Link href="/terms#privacy" className="hover:text-gray-500 transition-colors">Privacy</Link>
          </div>
          <ReviewFloFooter whiteLabel={footer.whiteLabel} showBranding={footer.showReviewFloBranding} />
        </div>

      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }
  const rating = parseInt(context.query.rating as string) || 3

  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !business) {
    return { notFound: true }
  }

  return { props: { business, rating } }
}
