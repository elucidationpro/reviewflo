import Link from 'next/link'
import ReviewFloFooter from '../ReviewFloFooter'
import type { ResolvedReviewFooter } from '@/lib/review-page-branding'

export type CustomerReviewFooterLinksProps = {
  footer: ResolvedReviewFooter
  /** ReviewFloFooter compact mode for settings embed */
  compactFooter?: boolean
  termsAsSpan?: boolean
}

/** Terms/Privacy row + ReviewFlo (or white-label) footer, shared by the rating panels. */
export default function CustomerReviewFooterLinks({
  footer,
  compactFooter = false,
  termsAsSpan = false,
}: CustomerReviewFooterLinksProps) {
  return (
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
  )
}
