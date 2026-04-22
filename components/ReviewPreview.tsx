import { useState } from 'react'
import ReviewFloFooter from './ReviewFloFooter'

interface ReviewTemplate {
  id: string
  template_text: string
  platform: 'google' | 'facebook' | 'yelp'
}

interface ReviewPreviewProps {
  businessName: string
  primaryColor: string
  logoUrl: string | null
  showBusinessName: boolean
  showReviewfloBranding: boolean
  googleReviewUrl: string | null
  facebookReviewUrl: string | null
  yelpReviewUrl: string | null
  nextdoorReviewUrl: string | null
  skipTemplateChoice: boolean
  templates: ReviewTemplate[]
  /** When true, footer shows “Powered by {brand}” instead of ReviewFlo (e.g. AI white-label). */
  whiteLabelEnabled?: boolean
  whiteLabelBrandName?: string | null
  whiteLabelBrandColor?: string | null
}

type Screen = 'rating' | 'five_star' | 'feedback' | 'thanks'
type ReviewPath = null | 'write_own' | 'use_template'

const StarPath = () => (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
  />
)

export default function ReviewPreview({
  businessName,
  primaryColor,
  logoUrl,
  showBusinessName,
  showReviewfloBranding,
  googleReviewUrl,
  facebookReviewUrl,
  yelpReviewUrl,
  nextdoorReviewUrl,
  skipTemplateChoice,
  templates,
  whiteLabelEnabled = false,
  whiteLabelBrandName = null,
  whiteLabelBrandColor = null,
}: ReviewPreviewProps) {
  const [screen, setScreen] = useState<Screen>('rating')
  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  const [reviewPath, setReviewPath] = useState<ReviewPath>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [whatHappened, setWhatHappened] = useState('')
  const [howToMakeRight, setHowToMakeRight] = useState('')
  const [wantsContact, setWantsContact] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactError, setContactError] = useState('')

  const platforms = [
    { name: 'Google', url: googleReviewUrl },
    { name: 'Facebook', url: facebookReviewUrl },
    { name: 'Yelp', url: yelpReviewUrl },
    { name: 'Nextdoor', url: nextdoorReviewUrl },
  ].filter((p): p is { name: string; url: string } => !!p.url)

  const nonEmptyTemplates = templates.filter(t => t.template_text.trim())
  const hasPlatformLinks = platforms.length > 0
  const displayRating = hoveredRating ?? selectedRating ?? 0
  const displayName = businessName || 'Your Business'
  const accentColor =
    whiteLabelEnabled && whiteLabelBrandColor?.trim()
      ? whiteLabelBrandColor.trim()
      : primaryColor
  const previewWlName =
    whiteLabelEnabled && (whiteLabelBrandName?.trim() || displayName.trim())
      ? whiteLabelBrandName?.trim() || displayName.trim()
      : null
  const footerWhiteLabel = previewWlName
    ? { brandName: previewWlName, brandColor: whiteLabelBrandColor }
    : null
  const showRfFooter = !footerWhiteLabel && showReviewfloBranding

  const handleStarClick = (star: number) => {
    setSelectedRating(star)
    // Mirrors production /[slug].tsx: 1-4 -> private feedback (Google link
    // still surfaced on that screen); 5 only -> prominent Google CTA.
    if (star <= 4) {
      setScreen('feedback')
    } else {
      setReviewPath(skipTemplateChoice && hasPlatformLinks ? 'write_own' : null)
      setScreen('five_star')
    }
  }

  const reset = () => {
    setScreen('rating')
    setSelectedRating(null)
    setHoveredRating(null)
    setReviewPath(null)
    setSelectedTemplate(null)
    setWhatHappened('')
    setHowToMakeRight('')
    setWantsContact(false)
    setContactEmail('')
    setContactPhone('')
    setContactError('')
  }

  const submitFeedbackPreview = () => {
    if (wantsContact && !contactEmail.trim() && !contactPhone.trim()) {
      setContactError('Please provide an email or phone number so we can reach you.')
      return
    }
    setContactError('')
    setScreen('thanks')
  }

  return (
    <div className="w-full max-w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-400/50" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/50" />
          <span className="w-3 h-3 rounded-full bg-green-400/50" />
          <span className="ml-2 text-xs font-medium text-gray-400">Customer Preview</span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          Reset ↺
        </button>
      </div>

      {/* Screen content — mobile proportions: gray viewport, card 80% width, upper-middle placement */}
      <div className="bg-[#F9F9F9] min-h-[480px] flex flex-col items-center pt-6 pb-16 overflow-y-auto">
        <div className="w-full flex-1 flex flex-col items-center max-w-[440px] mx-auto px-6">

        {/* ── Rating screen ── */}
        {screen === 'rating' && (
          <div className="w-[85%] max-w-[360px] mx-auto bg-white rounded-[20px] border border-gray-100 px-8 py-12 text-center shadow-[0_2px_16px_rgba(0,0,0,0.06)] min-h-[340px] overflow-hidden">
            {logoUrl && (
              <div className="flex justify-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt={displayName} className="max-h-16 w-auto object-contain" />
              </div>
            )}
            {showBusinessName && (
              <h3 className="text-xl font-bold tracking-tight mb-1" style={{ color: accentColor }}>
                {displayName}
              </h3>
            )}
            <p className="text-gray-400 text-sm mb-8">How was your experience?</p>
            <div className="flex justify-center items-center gap-2 mb-5 max-w-full overflow-hidden">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  className="flex-shrink-0 transition-transform active:scale-95 cursor-pointer p-0.5 rounded focus:outline-none"
                  aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                >
                  <svg
                    className="w-10 h-10 min-w-0 transition-colors duration-150"
                    fill={star <= displayRating ? accentColor : 'none'}
                    stroke={star <= displayRating ? accentColor : '#CBD5E1'}
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <StarPath />
                  </svg>
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-sm">Tap a star to rate</p>
          </div>
        )}
        {screen === 'rating' && (
          <div className="w-[85%] max-w-[360px] mx-auto mt-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-300">
              <span>Terms</span>
              <span>·</span>
              <span>Privacy</span>
            </div>
            {(showRfFooter || footerWhiteLabel) && (
              <ReviewFloFooter whiteLabel={footerWhiteLabel} showBranding={showRfFooter} compact />
            )}
          </div>
        )}

        {/* ── 5-star flow ── */}
        {screen === 'five_star' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <button
              type="button"
              onClick={reset}
              className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to rating
            </button>
            {logoUrl && (
              <div className="flex justify-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt={displayName} className="max-h-16 w-auto object-contain" />
              </div>
            )}
            {showBusinessName && (
              <h3 className="text-lg font-bold text-center tracking-tight mb-4" style={{ color: accentColor }}>
                {displayName}
              </h3>
            )}
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} className="w-7 h-7" fill={accentColor} viewBox="0 0 24 24" aria-hidden>
                  <StarPath />
                </svg>
              ))}
            </div>
            <p className="text-center font-semibold text-gray-900 text-sm mb-1">Thanks for the 5-star rating!</p>
            <p className="text-center text-gray-500 text-sm mb-6 pb-6 border-b border-gray-100">
              {skipTemplateChoice && hasPlatformLinks
                ? 'Choose where to leave your review:'
                : 'How would you like to leave your review?'}
            </p>

            {/* Path choice */}
            {!reviewPath && !skipTemplateChoice && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setReviewPath('write_own')}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all cursor-pointer text-left"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentColor}18` }}>
                    <svg className="w-5 h-5" style={{ color: accentColor }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Write your own</p>
                    <p className="text-xs text-gray-400 mt-0.5">In your own words</p>
                  </div>
                </button>
                {nonEmptyTemplates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setReviewPath('use_template')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all cursor-pointer text-left"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${accentColor}18` }}>
                      <svg className="w-5 h-5" style={{ color: accentColor }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Use a template</p>
                      <p className="text-xs text-gray-400 mt-0.5">Quick pre-written option</p>
                    </div>
                  </button>
                )}
                {!hasPlatformLinks && (
                  <p className="text-sm text-amber-600 text-center pt-1">Add review links to see platform buttons.</p>
                )}
              </div>
            )}

            {/* Write own — platform selection */}
            {reviewPath === 'write_own' && (
              <div>
                {!skipTemplateChoice && (
                  <button type="button" onClick={() => setReviewPath(null)} className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                )}
                <p className="text-sm font-semibold text-gray-700 mb-3">Choose a platform:</p>
                {platforms.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-3">No review links added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {platforms.map(platform => (
                      <button
                        key={platform.name}
                        type="button"
                        onClick={(e) => e.preventDefault()}
                        title="Preview only — link disabled"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-all cursor-default"
                      >
                        <span className="text-sm font-medium text-gray-800 flex-1 text-left">{platform.name}</span>
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Template selection */}
            {reviewPath === 'use_template' && !selectedTemplate && (
              <div>
                <button type="button" onClick={() => setReviewPath(null)} className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <p className="text-sm font-semibold text-gray-700 mb-3">Choose a template:</p>
                <div className="space-y-2">
                  {nonEmptyTemplates.map((template, idx) => (
                    <button
                      key={template.id || idx}
                      type="button"
                      onClick={() => setSelectedTemplate(template.template_text)}
                      className="w-full border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5" style={{ backgroundColor: accentColor }}>
                          {idx + 1}
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed flex-1">{template.template_text}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Template + platform */}
            {reviewPath === 'use_template' && selectedTemplate && (
              <div>
                <button type="button" onClick={() => setSelectedTemplate(null)} className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Choose different template
                </button>
                <div className="mb-4 flex items-center gap-2 px-3 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-emerald-800 text-sm font-medium">Template copied to clipboard</p>
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Choose where to post:</p>
                {platforms.length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center py-3">No review links added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {platforms.map(platform => (
                      <button
                        key={platform.name}
                        type="button"
                        onClick={(e) => e.preventDefault()}
                        title="Preview only — link disabled"
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-all cursor-default"
                      >
                        <span className="text-sm font-medium text-gray-800 flex-1 text-left">{platform.name}</span>
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {screen === 'five_star' && (showRfFooter || footerWhiteLabel) && (
          <ReviewFloFooter whiteLabel={footerWhiteLabel} showBranding={showRfFooter} compact />
        )}

        {/* ── Feedback screen ── */}
        {screen === 'feedback' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
            <button
              type="button"
              onClick={reset}
              className="mb-4 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to rating
            </button>
            {logoUrl && (
              <div className="flex justify-center mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt={displayName} className="max-h-16 w-auto object-contain" />
              </div>
            )}
            {showBusinessName && (
              <h3 className="text-lg font-bold text-center tracking-tight mb-1" style={{ color: accentColor }}>
                {displayName}
              </h3>
            )}
            <p className="text-gray-400 text-sm text-center mb-6">We&apos;d like to understand what happened.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">What happened?</label>
                <textarea
                  value={whatHappened}
                  onChange={e => setWhatHappened(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 resize-none"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="Please describe your experience…"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">How can we make it right?</label>
                <textarea
                  value={howToMakeRight}
                  onChange={e => setHowToMakeRight(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 resize-none"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  placeholder="What would make this better for you…"
                />
              </div>
              <div className="pt-1 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={wantsContact}
                    onChange={(e) => {
                      setWantsContact(e.target.checked)
                      if (!e.target.checked) setContactError('')
                    }}
                    className="w-4 h-4 rounded cursor-pointer shrink-0"
                    style={{ accentColor: accentColor }}
                  />
                  <span className="text-sm text-gray-700">I&apos;d like to be contacted about this</span>
                </label>
              </div>

              {wantsContact && (
                <div className="space-y-3 pl-1 sm:pl-7">
                  <div>
                    <label htmlFor="preview-feedback-email" className="block text-xs font-medium text-gray-600 mb-1">
                      Email <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="preview-feedback-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => {
                        setContactEmail(e.target.value)
                        if (contactError) setContactError('')
                      }}
                      placeholder="your@email.com"
                      autoComplete="email"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder-gray-300 text-sm"
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    />
                  </div>
                  <div>
                    <label htmlFor="preview-feedback-phone" className="block text-xs font-medium text-gray-600 mb-1">
                      Phone <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="preview-feedback-phone"
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => {
                        setContactPhone(e.target.value)
                        if (contactError) setContactError('')
                      }}
                      placeholder="(555) 123-4567"
                      autoComplete="tel"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 placeholder-gray-300 text-sm"
                      style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    />
                  </div>
                  <p className="text-xs text-gray-400">Provide at least one contact method</p>
                </div>
              )}

              {contactError && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                  <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-red-700 text-xs leading-snug">{contactError}</p>
                </div>
              )}

              <button
                type="button"
                onClick={submitFeedbackPreview}
                style={{ backgroundColor: accentColor }}
                className="w-full text-white font-semibold py-3.5 px-4 text-sm rounded-xl transition-opacity active:opacity-80 cursor-pointer"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        )}
        {screen === 'feedback' && (showRfFooter || footerWhiteLabel) && (
          <ReviewFloFooter whiteLabel={footerWhiteLabel} showBranding={showRfFooter} compact />
        )}

        {/* ── Thanks screen ── */}
        {screen === 'thanks' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-12 text-center">
            {logoUrl && (
              <div className="flex justify-center mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt={displayName} className="max-h-16 w-auto object-contain" />
              </div>
            )}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${accentColor}18` }}
            >
              <svg className="w-8 h-8" style={{ color: accentColor }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Thank you for your feedback</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {wantsContact
                ? "We'll be in touch soon to make things right."
                : 'We appreciate you taking the time to share your experience.'}
            </p>
            {wantsContact && (contactEmail.trim() || contactPhone.trim()) && (
              <div className="mt-5 text-left rounded-xl border border-blue-100 bg-blue-50/80 px-4 py-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">Contact details shared</p>
                {contactEmail.trim() && (
                  <p className="text-sm text-blue-900">
                    <span className="text-blue-700/80">Email: </span>
                    <span className="break-all">{contactEmail.trim()}</span>
                  </p>
                )}
                {contactPhone.trim() && (
                  <p className={`text-sm text-blue-900 ${contactEmail.trim() ? 'mt-1' : ''}`}>
                    <span className="text-blue-700/80">Phone: </span>
                    {contactPhone.trim()}
                  </p>
                )}
              </div>
            )}
            {googleReviewUrl && (
              <div className="mt-6 pt-5 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-3">
                  Prefer to share publicly? You can also leave a Google review.
                </p>
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Write a Google review
                </a>
              </div>
            )}
          </div>
        )}
        {screen === 'thanks' && (showRfFooter || footerWhiteLabel) && (
          <ReviewFloFooter whiteLabel={footerWhiteLabel} showBranding={showRfFooter} compact />
        )}
        </div>
      </div>

      {/* Footer note */}
      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/80">
        <p className="text-xs text-gray-400 text-center">Preview only — no data is saved</p>
      </div>
    </div>
  )
}
