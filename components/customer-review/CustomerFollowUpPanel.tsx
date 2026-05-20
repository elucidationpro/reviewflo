import Link from 'next/link'
import ReviewFloFooter from '../ReviewFloFooter'
import { MAX_REVIEW_FOLLOWUP_ANSWER } from '@/lib/review-page-followup'
import type { ResolvedReviewFooter } from '@/lib/review-page-branding'

export type CustomerFollowUpPanelProps = {
  businessName: string
  logoUrl: string | null
  accentColor: string
  question: string
  placeholder: string | null
  answer: string
  onAnswerChange: (value: string) => void
  formError?: string
  isSubmitting?: boolean
  onContinue: () => void
  onSkip: () => void
  footer: ResolvedReviewFooter
  compactFooter?: boolean
  termsAsSpan?: boolean
}

export default function CustomerFollowUpPanel({
  businessName,
  logoUrl,
  accentColor,
  question,
  placeholder,
  answer,
  onAnswerChange,
  formError,
  isSubmitting = false,
  onContinue,
  onSkip,
  footer,
  compactFooter = false,
  termsAsSpan = false,
}: CustomerFollowUpPanelProps) {
  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 md:p-10 lg:p-12">
        {logoUrl && (
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={businessName}
              className="max-h-24 md:max-h-28 w-auto object-contain"
            />
          </div>
        )}

        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center mb-6">
          {question}
        </h1>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onContinue()
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="followupAnswer" className="sr-only">
              Your answer
            </label>
            <textarea
              id="followupAnswer"
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              maxLength={MAX_REVIEW_FOLLOWUP_ANSWER}
              rows={4}
              disabled={isSubmitting}
              placeholder={placeholder ?? 'Share a few words…'}
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
            onClick={onSkip}
            disabled={isSubmitting}
            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-60 cursor-pointer"
          >
            Skip
          </button>
        </form>
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
