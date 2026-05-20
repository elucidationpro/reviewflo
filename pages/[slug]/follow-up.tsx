import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { resolveAccountBillingTier } from '../../lib/account-billing-tier'
import { supabase } from '../../lib/supabase'
import ReviewFloFooter from '../../components/ReviewFloFooter'
import { trackEvent } from '../../lib/posthog-provider'
import { getReviewAccentColor, resolvePublicReviewFooter } from '../../lib/review-page-branding'
import {
  MAX_REVIEW_FOLLOWUP_ANSWER,
  resolveReviewPageFollowup,
  shouldShowReviewPageFollowup,
  type ReviewPageFollowupBusiness,
} from '../../lib/review-page-followup'

interface Business extends ReviewPageFollowupBusiness {
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

import type { Tier } from '../../lib/tier-permissions'

interface PageProps {
  business: Business
  rating: number
  reviewId: string
  accountTierForReview: Tier
}

function getDisplayLogoUrl(b: Business): string | null {
  return b.logo_url || null
}

function routeAfterFollowup(
  router: ReturnType<typeof useRouter>,
  business: Business,
  rating: number,
  trackingToken: string | null
) {
  const tokenParam = trackingToken ? `&t=${trackingToken}` : ''
  if (rating >= 1 && rating <= 4) {
    router.push(`/${business.slug}/feedback?rating=${rating}${tokenParam}`)
  } else {
    router.push(`/${business.slug}/templates?${trackingToken ? `t=${trackingToken}` : ''}`)
  }
}

export default function FollowUpPage({
  business,
  rating,
  reviewId,
  accountTierForReview,
}: PageProps) {
  const router = useRouter()
  const accentColor = getReviewAccentColor(business)
  const footer = resolvePublicReviewFooter(business)
  const followup = resolveReviewPageFollowup(business, { accountTier: accountTierForReview })
  const displayLogoUrl = getDisplayLogoUrl(business)
  const [answer, setAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const trackingToken = typeof router.query.t === 'string' ? router.query.t : null

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const trimmed = answer.trim()
    if (!trimmed) {
      setFormError('Please share a quick answer before continuing.')
      return
    }
    if (trimmed.length > MAX_REVIEW_FOLLOWUP_ANSWER) {
      setFormError(`Please keep your answer under ${MAX_REVIEW_FOLLOWUP_ANSWER} characters.`)
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/save-review-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          businessId: business.id,
          answer: trimmed,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setFormError((data as { error?: string }).error || 'Something went wrong. Please try again.')
        setIsSubmitting(false)
        return
      }

      trackEvent('review_followup_answered', {
        rating,
        businessId: business.id,
        businessName: business.business_name,
        answerLength: trimmed.length,
      })

      routeAfterFollowup(router, business, rating, trackingToken)
    } catch (err) {
      console.error('Error saving follow-up answer:', err)
      setFormError('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    routeAfterFollowup(router, business, rating, trackingToken)
  }

  if (!followup) {
    return null
  }

  return (
    <>
      <Head>
        <title>{`${business.business_name} - One quick question`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-dvh bg-gray-50 px-4 py-8 sm:py-12">
        <div className="max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-10 lg:p-12">
            {displayLogoUrl && (
              <div className="flex justify-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayLogoUrl}
                  alt={business.business_name}
                  className="max-h-24 md:max-h-28 w-auto object-contain"
                />
              </div>
            )}

            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center mb-6">
              {followup.question}
            </h1>

            <form onSubmit={handleContinue} className="space-y-4">
              <div>
                <label htmlFor="followupAnswer" className="sr-only">
                  Your answer
                </label>
                <textarea
                  id="followupAnswer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  maxLength={MAX_REVIEW_FOLLOWUP_ANSWER}
                  rows={4}
                  disabled={isSubmitting}
                  placeholder={followup.placeholder ?? 'Share a few words…'}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:bg-gray-50 disabled:text-gray-400"
                />
                <p className="text-xs text-gray-400 text-right mt-1">
                  {answer.length}/{MAX_REVIEW_FOLLOWUP_ANSWER}
                </p>
              </div>

              {formError && (
                <p className="text-sm text-red-600 text-center" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting ? 'Saving…' : 'Continue'}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-60 cursor-pointer"
              >
                Skip
              </button>
            </form>
          </div>

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
            <ReviewFloFooter whiteLabel={footer.whiteLabel} showBranding={footer.showReviewFloBranding} />
          </div>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string }
  const ratingRaw = context.query.rating
  const reviewIdRaw = context.query.reviewId
  const rating = typeof ratingRaw === 'string' ? parseInt(ratingRaw, 10) : NaN
  const reviewId = typeof reviewIdRaw === 'string' ? reviewIdRaw : ''

  if (!reviewId || Number.isNaN(rating) || rating < 1 || rating > 5) {
    return { notFound: true }
  }

  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !business) {
    return { notFound: true }
  }

  const accountTierForReview = await resolveAccountBillingTier(supabase, business)

  if (!shouldShowReviewPageFollowup(business, { accountTier: accountTierForReview })) {
    return { notFound: true }
  }

  return {
    props: {
      business,
      rating,
      reviewId,
      accountTierForReview,
    },
  }
}