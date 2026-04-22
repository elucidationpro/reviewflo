import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import ReviewFloFooter from '../components/ReviewFloFooter'
import { trackEvent } from '../lib/posthog-provider'
import { getReviewAccentColor, resolvePublicReviewFooter } from '../lib/review-page-branding'

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
}

function getDisplayLogoUrl(b: Business): string | null {
  return b.logo_url || null
}

export default function ReviewPage({ business }: PageProps) {
  const router = useRouter()
  const accentColor = getReviewAccentColor(business)
  const footer = resolvePublicReviewFooter(business)
  const displayLogoUrl = getDisplayLogoUrl(business)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Tracking token passed via URL from the email click redirect
  const trackingToken = typeof router.query.t === 'string' ? router.query.t : null

  const handleStarClick = async (rating: number) => {
    if (isSubmitting) return

    setSelectedRating(rating)
    setIsSubmitting(true)

    const startTime = Date.now()

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          business_id: business.id,
          star_rating: rating,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving review:', error)
        setIsSubmitting(false)
        return
      }

      const responseTime = Date.now() - startTime
      trackEvent('customer_responded', {
        rating,
        businessId: business.id,
        businessName: business.business_name,
        responseTime,
      })

      // Mark completed on any star click — fire and forget, never block the customer
      if (trackingToken) {
        fetch('/api/track/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: trackingToken }),
        }).catch(() => {})
      }

      // Carry the tracking token forward so templates page can record completion
      const tokenParam = trackingToken ? `&t=${trackingToken}` : ''

      // FTC Consumer Review Rule compliance: the Google link is surfaced on BOTH
      // paths (templates + feedback), so rating-based routing is purely UX, not
      // gating. 1-3 stars get a private feedback form with a secondary Google
      // link; 4-5 stars go straight to the prominent Google CTA.
      if (rating >= 1 && rating <= 3) {
        router.push(`/${business.slug}/feedback?rating=${rating}${tokenParam}`)
      } else {
        router.push(`/${business.slug}/templates?${tokenParam ? `t=${trackingToken}` : ''}`)
      }
    } catch (err) {
      console.error('Error submitting rating:', err)
      setIsSubmitting(false)
    }
  }

  const displayRating = hoveredRating || selectedRating || 0

  return (
    <>
      <Head>
        <title>{`${business.business_name} - Share Your Experience`}</title>
        <meta name="description" content="How was your recent experience? We'd love to hear your feedback." />
        <meta property="og:title" content={`${business.business_name} - Share Your Experience`} />
        <meta property="og:description" content="How was your recent experience? We'd love to hear your feedback." />
        <meta property="og:url" content={`https://usereviewflo.com/${business.slug}`} />
        <meta property="og:image" content={`https://usereviewflo.com/api/og-business?name=${encodeURIComponent(business.business_name)}${displayLogoUrl ? `&logo=${encodeURIComponent(displayLogoUrl)}` : ''}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${business.business_name} - Share Your Experience`} />
        <meta name="twitter:description" content="How was your recent experience? We'd love to hear your feedback." />
        <meta name="twitter:image" content={`https://usereviewflo.com/api/og-business?name=${encodeURIComponent(business.business_name)}${displayLogoUrl ? `&logo=${encodeURIComponent(displayLogoUrl)}` : ''}`} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-dvh flex flex-col items-center justify-center bg-gray-50 px-4 py-10">
        <div className="w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl xl:max-w-2xl">

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 md:px-14 md:py-14 lg:px-20 lg:py-20 xl:px-24 xl:py-24">
            {/* Logo */}
            {displayLogoUrl && (
              <div className="flex justify-center mb-6 md:mb-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayLogoUrl}
                  alt={business.business_name}
                  className="max-h-36 md:max-h-44 w-auto object-contain"
                />
              </div>
            )}
            {/* Business Name — hidden if owner disabled it */}
            {business.show_business_name !== false && (
              <h1
                className="text-xl md:text-2xl lg:text-4xl xl:text-5xl font-bold text-center tracking-tight mb-1"
                style={{ color: accentColor }}
              >
                {business.business_name}
              </h1>
            )}
            <p className="text-gray-400 text-sm md:text-base lg:text-xl xl:text-2xl text-center mb-8 md:mb-10 lg:mb-12 xl:mb-14">
              How was your experience?
            </p>

            {/* Star Rating */}
            <div className="flex justify-center items-center gap-2 md:gap-3 lg:gap-5 xl:gap-6 mb-6 md:mb-8 lg:mb-10 xl:mb-12">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => !isSubmitting && setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  disabled={isSubmitting}
                  style={{ touchAction: 'manipulation' }}
                  className="transition-transform duration-150 hover:scale-110 active:scale-95 focus:outline-none rounded disabled:cursor-not-allowed p-0.5 cursor-pointer"
                  aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                  <svg
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 transition-colors duration-150"
                    fill={star <= displayRating ? accentColor : 'none'}
                    stroke={star <= displayRating ? accentColor : '#CBD5E1'}
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>
              ))}
            </div>

            {/* Status */}
            {isSubmitting ? (
              <div className="text-center h-8 flex flex-col items-center justify-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full border-2 border-gray-100 animate-spin"
                  style={{ borderTopColor: accentColor }}
                />
                <p className="text-gray-400 text-xs md:text-sm lg:text-base">Saving…</p>
              </div>
            ) : (
              <p className="text-center text-gray-400 text-xs md:text-sm lg:text-base h-8 flex items-center justify-center">
                Tap a star to rate
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="mt-5 text-center">
            <div className="flex items-center justify-center gap-3 text-xs text-gray-300 mb-1">
              <Link href="/terms" className="hover:text-gray-500 transition-colors">
                Terms
              </Link>
              <span>·</span>
              <Link href="/terms#privacy" className="hover:text-gray-500 transition-colors">
                Privacy
              </Link>
            </div>
            <ReviewFloFooter
              whiteLabel={footer.whiteLabel}
              showBranding={footer.showReviewFloBranding}
            />
          </div>

        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }

  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !business) {
    return { notFound: true }
  }

  return { props: { business } }
}
