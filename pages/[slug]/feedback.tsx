import { GetServerSideProps } from 'next'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Business {
  id: string
  business_name: string
  slug: string
  primary_color: string
}

interface PageProps {
  business: Business
}

export default function FeedbackPage({ business }: PageProps) {
  const [whatHappened, setWhatHappened] = useState('')
  const [howToMakeRight, setHowToMakeRight] = useState('')
  const [wantsContact, setWantsContact] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!whatHappened.trim() || !howToMakeRight.trim()) {
      alert('Please fill in both fields')
      return
    }

    if (wantsContact && !email.trim() && !phone.trim()) {
      alert('Please provide an email or phone number if you want us to contact you')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          business_id: business.id,
          what_happened: whatHappened.trim(),
          how_to_make_right: howToMakeRight.trim(),
          wants_contact: wantsContact,
          email: wantsContact ? email.trim() || null : null,
          phone: wantsContact ? phone.trim() || null : null,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error saving feedback:', error)
        alert('There was an error submitting your feedback. Please try again.')
        setIsSubmitting(false)
        return
      }

      setIsSubmitted(true)
    } catch (err) {
      console.error('Error submitting feedback:', err)
      alert('There was an error submitting your feedback. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
            {/* Success Icon */}
            <div className="mb-6">
              <svg
                className="w-20 h-20 mx-auto"
                style={{ color: business.primary_color }}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Thank You Message */}
            <h1
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: business.primary_color }}
            >
              Thank You!
            </h1>

            <p className="text-gray-600 text-lg mb-2">
              We appreciate you taking the time to share your feedback with us.
            </p>

            {wantsContact && (
              <p className="text-gray-600 text-lg mb-6">
                We&apos;ll be in touch with you soon to make things right.
              </p>
            )}

            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-gray-500 text-sm">
                Your feedback helps us improve our service.
              </p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-400 text-sm mt-6">
            Powered by ReviewFlow
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4 py-8">
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
          <p className="text-gray-600 text-center mb-8 text-lg">
            We&apos;re sorry to hear about your experience. Please help us understand what happened.
          </p>

          {/* Feedback Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* What Happened Field */}
            <div>
              <label
                htmlFor="whatHappened"
                className="block text-lg font-semibold text-gray-700 mb-2"
              >
                What happened?
              </label>
              <textarea
                id="whatHappened"
                value={whatHappened}
                onChange={(e) => setWhatHappened(e.target.value)}
                placeholder="Please describe your experience..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent resize-none text-gray-900 placeholder-gray-400"
                style={{
                  focusRingColor: business.primary_color + '80'
                }}
                required
              />
            </div>

            {/* How Can We Make It Right Field */}
            <div>
              <label
                htmlFor="howToMakeRight"
                className="block text-lg font-semibold text-gray-700 mb-2"
              >
                How can we make it right?
              </label>
              <textarea
                id="howToMakeRight"
                value={howToMakeRight}
                onChange={(e) => setHowToMakeRight(e.target.value)}
                placeholder="What would make this better for you..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent resize-none text-gray-900 placeholder-gray-400"
                style={{
                  focusRingColor: business.primary_color + '80'
                }}
                required
              />
            </div>

            {/* Contact Checkbox */}
            <div className="border-t border-gray-200 pt-6">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={wantsContact}
                  onChange={(e) => setWantsContact(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded cursor-pointer"
                  style={{
                    accentColor: business.primary_color
                  }}
                />
                <span className="ml-3 text-gray-700 font-medium">
                  Would you like us to contact you?
                </span>
              </label>
            </div>

            {/* Conditional Contact Fields */}
            {wantsContact && (
              <div className="space-y-4 pl-8 animate-fadeIn">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent text-gray-900 placeholder-gray-400"
                    style={{
                      focusRingColor: business.primary_color + '80'
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent text-gray-900 placeholder-gray-400"
                    style={{
                      focusRingColor: business.primary_color + '80'
                    }}
                  />
                </div>

                <p className="text-sm text-gray-500 italic">
                  Please provide at least one contact method
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-[1.02]"
                style={{
                  backgroundColor: business.primary_color,
                  opacity: isSubmitting ? 0.5 : 1
                }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Powered by ReviewFlow
        </p>
      </div>
    </div>
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
