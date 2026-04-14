import Image from 'next/image'

export type ReviewFloWhiteLabel = {
  brandName: string
  brandColor?: string | null
}

interface ReviewFloFooterProps {
  /** When set, show “Powered by {brandName}” instead of ReviewFlo (takes precedence). */
  whiteLabel?: ReviewFloWhiteLabel | null
  /** Show linked ReviewFlo branding. Ignored when `whiteLabel` is set. */
  showBranding?: boolean
  /** Tighter spacing for embedded previews (e.g. settings demo). */
  compact?: boolean
}

export default function ReviewFloFooter({
  whiteLabel = null,
  showBranding = true,
  compact = false,
}: ReviewFloFooterProps) {
  const margin = compact ? 'mt-4 pt-4' : 'mt-8 pt-6'
  const wlName = whiteLabel?.brandName?.trim()

  if (wlName) {
    const accent = whiteLabel?.brandColor?.trim()
    return (
      <div className={`${margin} border-t border-gray-200`}>
        <p className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-sm text-center px-2">
          <span className="text-gray-400">Powered by</span>
          <span className="font-semibold text-gray-800" style={accent ? { color: accent } : undefined}>
            {wlName}
          </span>
        </p>
      </div>
    )
  }

  if (!showBranding) return null

  return (
    <a
      href="https://usereviewflo.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`block ${margin} border-t border-gray-200 transition-opacity hover:opacity-70`}
    >
      <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
        <span>Powered by</span>
        <div className="relative w-24 h-6">
          <Image
            src="/images/reviewflo-logo.svg"
            alt="ReviewFlo"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </a>
  )
}
