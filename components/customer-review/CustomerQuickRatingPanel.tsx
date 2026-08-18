import { useState } from 'react'
import { Smile, Frown } from 'lucide-react'
import CustomerReviewFooterLinks from './CustomerReviewFooterLinks'
import { STAR_PATH } from './star-path'
import type { ResolvedReviewFooter } from '@/lib/review-page-branding'

export const QUICK_RATING_NEGATIVE_PROMPT = 'Sorry to hear that. How would you rate it?'

export type CustomerQuickRatingPanelProps = {
  businessName: string
  logoUrl: string | null
  showBusinessName: boolean
  accentColor: string
  headline: string
  subtext: string
  displayRating: number
  isSubmitting?: boolean
  /** Customer tapped "Great" — stored as a 5 with rating_source quick_positive. */
  onPositive: () => void
  /** Customer picked a star after tapping "Not great" (rating_source quick_stars). */
  onStarClick: (star: number) => void
  onStarHover?: (star: number | null) => void
  /** Fired when the customer opens the star step, for analytics. */
  onNegative?: () => void
  /**
   * Always-available Google link, shown below the panel regardless of what the customer
   * taps. Required posture under the FTC Consumer Review Rule — never gate this on sentiment.
   */
  googleReviewUrl?: string | null
  footer: ResolvedReviewFooter
  /** ReviewFloFooter compact mode for settings embed */
  compactFooter?: boolean
  termsAsSpan?: boolean
}

export default function CustomerQuickRatingPanel({
  businessName,
  logoUrl,
  showBusinessName,
  accentColor,
  headline,
  subtext,
  displayRating,
  isSubmitting = false,
  onPositive,
  onStarClick,
  onStarHover,
  onNegative,
  googleReviewUrl = null,
  footer,
  compactFooter = false,
  termsAsSpan = false,
}: CustomerQuickRatingPanelProps) {
  const [showStars, setShowStars] = useState(false)

  const openStarStep = () => {
    if (isSubmitting) return
    setShowStars(true)
    onNegative?.()
  }

  return (
    <>
      <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 md:px-14 md:py-14 lg:px-20 lg:py-20 xl:px-24 xl:py-24">
        {showStars && !isSubmitting && (
          <button
            type="button"
            onClick={() => setShowStars(false)}
            style={{ touchAction: 'manipulation' }}
            className="absolute top-4 left-4 md:top-6 md:left-6 flex items-center gap-1.5 text-sm md:text-base text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
        {logoUrl && (
          <div className="flex justify-center mb-6 md:mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={businessName}
              className="max-h-36 md:max-h-44 w-auto object-contain"
            />
          </div>
        )}
        {showBusinessName && (
          <h1
            className="text-xl md:text-2xl lg:text-4xl xl:text-5xl font-bold text-center tracking-tight mb-1"
            style={{ color: accentColor }}
          >
            {businessName}
          </h1>
        )}
        <p className="text-gray-400 text-sm md:text-base lg:text-xl xl:text-2xl text-center mb-8 md:mb-10 lg:mb-12 xl:mb-14">
          {showStars ? QUICK_RATING_NEGATIVE_PROMPT : headline}
        </p>

        {showStars ? (
          <div className="flex justify-center items-center gap-2 md:gap-3 lg:gap-5 xl:gap-6 mb-6 md:mb-8 lg:mb-10 xl:mb-12">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onStarClick(star)}
                onMouseEnter={() => !isSubmitting && onStarHover?.(star)}
                onMouseLeave={() => onStarHover?.(null)}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d={STAR_PATH} />
                </svg>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-center items-stretch gap-3 md:gap-4 lg:gap-5 mb-6 md:mb-8 lg:mb-10 xl:mb-12">
            <button
              type="button"
              onClick={onPositive}
              disabled={isSubmitting}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 flex flex-col items-center justify-center gap-2 md:gap-3 rounded-2xl border-2 border-gray-100 px-6 py-6 md:py-8 lg:py-10 transition-all duration-150 hover:border-gray-200 hover:bg-gray-50 active:scale-[0.98] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <Smile
                className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16"
                style={{ color: accentColor }}
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="font-semibold text-gray-800 text-base md:text-lg lg:text-xl">
                Great
              </span>
            </button>

            <button
              type="button"
              onClick={openStarStep}
              disabled={isSubmitting}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 flex flex-col items-center justify-center gap-2 md:gap-3 rounded-2xl border-2 border-gray-100 px-6 py-6 md:py-8 lg:py-10 transition-all duration-150 hover:border-gray-200 hover:bg-gray-50 active:scale-[0.98] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              <Frown
                className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 text-gray-400"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="font-semibold text-gray-800 text-base md:text-lg lg:text-xl">
                Not great
              </span>
            </button>
          </div>
        )}

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
            {subtext}
          </p>
        )}
      </div>

      {googleReviewUrl && (
        <p className="text-center text-sm text-gray-400 mt-5">
          Or{' '}
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            leave a Google review
          </a>
          {' '}directly.
        </p>
      )}

      <CustomerReviewFooterLinks
        footer={footer}
        compactFooter={compactFooter}
        termsAsSpan={termsAsSpan}
      />
    </>
  )
}
