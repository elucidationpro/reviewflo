import Link from 'next/link'
import ReviewFloFooter from '../ReviewFloFooter'
import type { ResolvedReviewFooter } from '@/lib/review-page-branding'

const STAR_PATH =
  'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'

export type CustomerRatingPanelProps = {
  businessName: string
  logoUrl: string | null
  showBusinessName: boolean
  accentColor: string
  headline: string
  subtext: string
  displayRating: number
  isSubmitting?: boolean
  onStarClick: (star: number) => void
  onStarHover?: (star: number | null) => void
  footer: ResolvedReviewFooter
  /** ReviewFloFooter compact mode for settings embed */
  compactFooter?: boolean
  termsAsSpan?: boolean
}

export default function CustomerRatingPanel({
  businessName,
  logoUrl,
  showBusinessName,
  accentColor,
  headline,
  subtext,
  displayRating,
  isSubmitting = false,
  onStarClick,
  onStarHover,
  footer,
  compactFooter = false,
  termsAsSpan = false,
}: CustomerRatingPanelProps) {
  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 md:px-14 md:py-14 lg:px-20 lg:py-20 xl:px-24 xl:py-24">
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
          {headline}
        </p>

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

      <div className="mt-5 text-center">
        <div className="flex items-center justify-center gap-3 text-xs text-gray-300 mb-1">
          {termsAsSpan ? (
            <span>Terms</span>
          ) : (
            <Link href="/terms" className="hover:text-gray-500 transition-colors">
              Terms
            </Link>
          )}
          <span>·</span>
          {termsAsSpan ? (
            <span>Privacy</span>
          ) : (
            <Link href="/terms#privacy" className="hover:text-gray-500 transition-colors">
              Privacy
            </Link>
          )}
        </div>
        <ReviewFloFooter
          whiteLabel={footer.whiteLabel}
          showBranding={footer.showReviewFloBranding}
          compact={compactFooter}
          previewOnly={compactFooter}
        />
      </div>
    </>
  )
}
