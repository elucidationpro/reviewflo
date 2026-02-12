import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import ReviewFloFooter from '../components/ReviewFloFooter'
import { trackEvent } from '../lib/posthog-provider'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
}

interface PageProps {
  business: Business
}

export default function ReviewPage({ business }: PageProps) {
  const router = useRouter()
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleStarClick = async (rating: number) => {
    if (isSubmitting) return

    setSelectedRating(rating)
    setIsSubmitting(true)

    const startTime = Date.now()

    try {
      // Save the rating to the reviews table
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

      // EVENT 4: Track customer response
      const responseTime = Date.now() - startTime
      trackEvent('customer_responded', {
        rating,
        businessId: business.id,
        businessName: business.business_name,
        responseTime, // Time in milliseconds
      })

      // Route based on rating
      if (rating >= 1 && rating <= 4) {
        router.push(`/${business.slug}/feedback?rating=${rating}`)
      } else if (rating === 5) {
        router.push(`/${business.slug}/templates`)
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
        <title>{business.business_name} - Share Your Experience</title>
        <meta name="description" content="How was your recent experience? We'd love to hear your feedback." />

        {/* Open Graph / Facebook */}
        <meta property="og:title" content={`${business.business_name} - Share Your Experience`} />
        <meta property="og:description" content="How was your recent experience? We'd love to hear your feedback." />
        <meta property="og:url" content={`https://usereviewflo.com/${business.slug}`} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${business.business_name} - Share Your Experience`} />
        <meta name="twitter:description" content="How was your recent experience? We'd love to hear your feedback." />

        {/* Prevent search indexing of individual business review pages */}
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            {/* Business Name */}
            <h1
              className="text-3xl md:text-4xl font-bold text-center mb-3"
              style={{ color: business.primary_color }}
            >
              {business.business_name}
            </h1>

          {/* Subtitle */}
          <p className="text-gray-600 text-center mb-8 md:mb-12 text-lg">
            How would you rate your experience?
          </p>

          {/* Star Rating */}
          <div className="flex justify-center items-center gap-4 md:gap-6 mb-8">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(null)}
                disabled={isSubmitting}
                className="transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-opacity-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Rate ${star} stars`}
              >
                <svg
                  className="w-16 h-16 md:w-20 md:h-20 transition-colors duration-200"
                  fill={star <= displayRating ? business.primary_color : 'none'}
                  stroke={star <= displayRating ? business.primary_color : '#D1D5DB'}
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
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

          {/* Loading indicator */}
          {isSubmitting && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                   style={{ borderColor: business.primary_color }}
              />
              <p className="text-gray-600 mt-3">Submitting your rating...</p>
            </div>
          )}

          {/* Helper text */}
          {!isSubmitting && (
            <p className="text-center text-gray-500 text-sm">
              Click a star to rate your experience
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-gray-400 text-sm mt-6 space-y-2">
          <div className="flex items-center justify-center gap-4 mb-4">
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
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }

  // Fetch business data from Supabase
  const { data: business, error } = await supabase
    .from('businesses')
    .select('id, business_name, slug, primary_color')
    .eq('slug', slug)
    .single()

  if (error || !business) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      business,
    },
  }
}
