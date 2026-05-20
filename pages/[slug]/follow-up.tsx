import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { resolveAccountBillingTier } from '../../lib/account-billing-tier'
import { supabase } from '../../lib/supabase'
import CustomerFollowUpPanel from '../../components/customer-review/CustomerFollowUpPanel'
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

  const handleContinue = async () => {
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
          <CustomerFollowUpPanel
            businessName={business.business_name}
            logoUrl={displayLogoUrl}
            accentColor={accentColor}
            question={followup.question}
            placeholder={followup.placeholder}
            answer={answer}
            onAnswerChange={setAnswer}
            formError={formError}
            isSubmitting={isSubmitting}
            onContinue={handleContinue}
            onSkip={handleSkip}
            footer={footer}
          />
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