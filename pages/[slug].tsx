import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { resolveAccountBillingTier } from '../lib/account-billing-tier'
import { supabase } from '../lib/supabase'
import CustomerRatingPanel from '../components/customer-review/CustomerRatingPanel'
import CustomerQuickRatingPanel from '../components/customer-review/CustomerQuickRatingPanel'
import { trackEvent } from '../lib/posthog-provider'
import { getReviewAccentColor, resolvePublicReviewFooter } from '../lib/review-page-branding'
import { resolveReviewPageCopy } from '../lib/review-page-copy'
import { shouldShowReviewPageFollowup } from '../lib/review-page-followup'
import {
  QUICK_RATING_POSITIVE_VALUE,
  resolvePositiveRatingExit,
  resolveQuickRatingDestination,
  shouldUseQuickRating,
  type RatingSource,
} from '../lib/review-page-quick-rating'
import type { Tier } from '../lib/tier-permissions'

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
  review_page_headline?: string | null
  review_page_subtext?: string | null
  review_page_followup_enabled?: boolean | null
  review_page_followup_question?: string | null
  review_page_followup_placeholder?: string | null
  review_page_quick_rating_enabled?: boolean | null
  review_page_quick_rating_destination?: string | null
  google_review_url?: string | null
}

interface PageProps {
  business: Business
  /** Account-level Pro/AI tier (child location rows may store `free` in DB). */
  accountTierForReview: Tier
}

function getDisplayLogoUrl(b: Business): string | null {
  return b.logo_url || null
}

export default function ReviewPage({ business, accountTierForReview }: PageProps) {
  const router = useRouter()
  const accentColor = getReviewAccentColor(business)
  const footer = resolvePublicReviewFooter(business)
  const quickRatingEnabled = shouldUseQuickRating(business, {
    accountTier: accountTierForReview,
  })
  const reviewCopy = resolveReviewPageCopy(business, { quickRating: quickRatingEnabled })
  const displayLogoUrl = getDisplayLogoUrl(business)
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Tracking token passed via URL from the email click redirect
  const trackingToken = typeof router.query.t === 'string' ? router.query.t : null

  const submitRating = async (rating: number, ratingSource: RatingSource) => {
    if (isSubmitting) return

    setSelectedRating(rating)
    setIsSubmitting(true)

    const startTime = Date.now()

    try {
      // Writes use the API route: anonymous Supabase clients cannot SELECT inserted rows under RLS,
      // so direct .insert().select('id') always fails for guests even when the insert succeeds.
      const saveReviewRes = await fetch('/api/save-customer-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          starRating: rating,
          ratingSource,
        }),
      })
      const savePayload = (await saveReviewRes.json().catch(() => null)) as {
        reviewId?: string
        error?: string
      } | null
      const reviewId = typeof savePayload?.reviewId === 'string' ? savePayload.reviewId : null

      if (!saveReviewRes.ok || !reviewId) {
        console.error('Error saving review:', savePayload ?? saveReviewRes.status)
        setIsSubmitting(false)
        return
      }

      const responseTime = Date.now() - startTime
      trackEvent('customer_responded', {
        rating,
        ratingSource,
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

      const tokenParam = trackingToken ? `&t=${trackingToken}` : ''
      const reviewIdParam = `reviewId=${reviewId}`

      // Re-fetch follow-up flags from DB before routing — page props may be stale if the
      // owner enabled follow-up in Settings after this page was initially loaded (SSR/cache).
      const FOLLOWUP_COLUMNS =
        'tier, review_page_followup_enabled, review_page_followup_question, review_page_followup_placeholder'
      const { data: withQuickRating } = await supabase
        .from('businesses')
        .select(
          `${FOLLOWUP_COLUMNS}, review_page_quick_rating_enabled, review_page_quick_rating_destination, google_review_url`
        )
        .eq('id', business.id)
        .single()

      // Quick-rating columns may not be migrated yet — don't lose the follow-up re-check over it.
      let latestBiz: Partial<Business> | null = withQuickRating
      if (!latestBiz) {
        const { data: followupOnly } = await supabase
          .from('businesses')
          .select(FOLLOWUP_COLUMNS)
          .eq('id', business.id)
          .single()
        latestBiz = followupOnly
      }

      const routingBusiness: Business =
        latestBiz && typeof latestBiz === 'object'
          ? { ...business, ...(latestBiz as Partial<Business>) }
          : business

      if (
        shouldShowReviewPageFollowup(routingBusiness, {
          accountTier: accountTierForReview,
        })
      ) {
        router.push(
          `/${business.slug}/follow-up?rating=${rating}&${reviewIdParam}${tokenParam}`
        )
        return
      }

      // FTC Consumer Review Rule compliance: the Google link is surfaced on BOTH
      // paths (templates + feedback), so rating-based routing is purely UX, not
      // gating. 1-4 stars get a private feedback form with a secondary Google
      // link; 5 stars only go straight to the prominent Google CTA.
      if (rating >= 1 && rating <= 4) {
        router.push(`/${business.slug}/feedback?rating=${rating}&${reviewIdParam}${tokenParam}`)
        return
      }

      const exit = resolvePositiveRatingExit({
        slug: business.slug,
        googleReviewUrl: routingBusiness.google_review_url,
        quickRatingEnabled: shouldUseQuickRating(routingBusiness, {
          accountTier: accountTierForReview,
        }),
        destination: resolveQuickRatingDestination(routingBusiness),
        trackingToken,
      })

      if (exit.kind === 'external') {
        // Skipping the platform screen means nothing else records the conversion.
        if (trackingToken) {
          fetch('/api/track/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: trackingToken, platform: 'google' }),
          }).catch(() => {})
        }
        trackEvent('five_star_to_google', {
          businessId: business.id,
          businessName: business.business_name,
        })
        window.location.href = exit.url
        return
      }

      router.push(exit.href)
    } catch (err) {
      console.error('Error submitting rating:', err)
      setIsSubmitting(false)
    }
  }

  const handleStarClick = (rating: number) =>
    submitRating(rating, quickRatingEnabled ? 'quick_stars' : 'stars')

  const handleQuickPositive = () => {
    setHoveredRating(null)
    submitRating(QUICK_RATING_POSITIVE_VALUE, 'quick_positive')
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

          {quickRatingEnabled ? (
            <CustomerQuickRatingPanel
              businessName={business.business_name}
              logoUrl={displayLogoUrl}
              showBusinessName={business.show_business_name !== false}
              accentColor={accentColor}
              headline={reviewCopy.headline}
              subtext={reviewCopy.subtext}
              displayRating={displayRating}
              isSubmitting={isSubmitting}
              onPositive={handleQuickPositive}
              onStarClick={handleStarClick}
              onStarHover={(star) => {
                if (!isSubmitting) setHoveredRating(star)
              }}
              onNegative={() =>
                trackEvent('quick_rating_negative_selected', {
                  businessId: business.id,
                  businessName: business.business_name,
                })
              }
              googleReviewUrl={business.google_review_url ?? null}
              footer={footer}
            />
          ) : (
            <CustomerRatingPanel
              businessName={business.business_name}
              logoUrl={displayLogoUrl}
              showBusinessName={business.show_business_name !== false}
              accentColor={accentColor}
              headline={reviewCopy.headline}
              subtext={reviewCopy.subtext}
              displayRating={displayRating}
              isSubmitting={isSubmitting}
              onStarClick={handleStarClick}
              onStarHover={(star) => {
                if (!isSubmitting) setHoveredRating(star)
              }}
              footer={footer}
            />
          )}

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

  const accountTierForReview = await resolveAccountBillingTier(supabase, business)

  return {
    props: {
      business,
      accountTierForReview,
    },
  }
}
