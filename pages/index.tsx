import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    businessType: '',
    phone: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Check for password recovery token in URL hash and redirect to update-password page
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const type = hashParams.get('type')

      // If this is a password recovery link, redirect to update-password page with the hash
      if (type === 'recovery') {
        router.push(`/update-password${window.location.hash}`)
      }
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/join-waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setFormData({ businessName: '', email: '', businessType: '', phone: '' })
      } else {
        alert('There was an error. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting waitlist:', error)
      alert('There was an error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
              Fix it before it goes public
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              ReviewFlo helps service businesses catch unhappy customers before they leave 1-star reviews,
              while making it easy for happy customers to share great reviews.
            </p>
            <button
              onClick={() => setShowWaitlist(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg px-12 py-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              Join the Waitlist
            </button>
          </div>

          {/* Visual Flow */}
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                How It Works
              </h3>
              <div className="grid md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="text-center">
                  <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">⭐</span>
                  </div>
                  <h4 className="font-bold text-lg mb-2">Customer Rates</h4>
                  <p className="text-gray-600 text-sm">
                    They click a link and rate their experience with 1-5 stars
                  </p>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex items-center justify-center">
                  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>

                {/* Step 2 */}
                <div className="text-center">
                  <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">💬</span>
                  </div>
                  <h4 className="font-bold text-lg mb-2">Smart Routing</h4>
                  <p className="text-gray-600 text-sm">
                    1-4 stars: Private feedback form
                    <br />
                    5 stars: Review templates
                  </p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <svg className="w-12 h-12 text-blue-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mt-4">
                {/* Outcome 1 */}
                <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
                  <h4 className="font-bold text-lg mb-2 text-yellow-900">Unhappy? Keep it Private</h4>
                  <p className="text-gray-700 text-sm">
                    Get actionable feedback directly, fix the issue, and prevent public negative reviews
                  </p>
                </div>

                {/* Outcome 2 */}
                <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                  <h4 className="font-bold text-lg mb-2 text-green-900">Happy? Share it Publicly</h4>
                  <p className="text-gray-700 text-sm">
                    Pre-written review templates make it effortless for satisfied customers to leave 5-star reviews
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-gray-900">
            Stop Losing Business to Bad Reviews
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            {/* Pain Point 1 */}
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">The Problem</h3>
              <p className="text-gray-600 mb-4">
                One bad review can cost you thousands in lost business
              </p>
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Our Solution</h4>
                <p className="text-sm text-gray-700">
                  Intercept unhappy customers before they post publicly. Get direct feedback and a chance to make it right.
                </p>
              </div>
            </div>

            {/* Pain Point 2 */}
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">The Problem</h3>
              <p className="text-gray-600 mb-4">
                Happy customers often don&apos;t bother leaving reviews
              </p>
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Our Solution</h4>
                <p className="text-sm text-gray-700">
                  Make it effortless with pre-written review templates they can copy and paste in seconds.
                </p>
              </div>
            </div>

            {/* Pain Point 3 */}
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">The Problem</h3>
              <p className="text-gray-600 mb-4">
                You never know there&apos;s a problem until it&apos;s too late
              </p>
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Our Solution</h4>
                <p className="text-sm text-gray-700">
                  Get instant email alerts when someone leaves critical feedback, with their contact info to follow up.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-blue-800 font-semibold text-lg mb-4">
              Currently in private beta with select service businesses
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
              Join Early Adopters Like Obsidian Auto
            </h2>
          </div>

          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            <div className="flex items-start mb-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl">
                  O
                </div>
              </div>
              <div className="ml-6">
                <h4 className="font-bold text-xl text-gray-900">Obsidian Auto</h4>
                <p className="text-gray-600">Mobile Auto Detailing • Phoenix, AZ</p>
              </div>
            </div>
            <div className="flex mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ))}
            </div>
            <p className="text-gray-700 text-lg leading-relaxed italic">
              &quot;ReviewFlo helped us catch issues before they became 1-star reviews. Now we get more 5-star reviews
              than ever because it&apos;s so easy for happy customers to share their experience.&quot;
            </p>
          </div>

          <div className="text-center mt-12">
            <p className="text-2xl font-bold text-blue-900">
              Launching Spring 2025
            </p>
          </div>
        </div>
      </section>

      {/* Waitlist Form Modal/Section */}
      {showWaitlist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 md:p-12">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-3xl font-bold text-gray-900">
                  {isSubmitted ? "You're on the list!" : 'Reserve Your Spot'}
                </h2>
                <button
                  onClick={() => {
                    setShowWaitlist(false)
                    setIsSubmitted(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              {isSubmitted ? (
                <div className="text-center py-8">
                  <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Check Your Email!
                  </h3>
                  <p className="text-gray-600 text-lg mb-8">
                    We&apos;ve sent you a confirmation. You&apos;ll be among the first to know when ReviewFlo launches.
                  </p>
                  <button
                    onClick={() => {
                      setShowWaitlist(false)
                      setIsSubmitted(false)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-semibold text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="businessType" className="block text-sm font-semibold text-gray-700 mb-2">
                      Type of Business *
                    </label>
                    <select
                      id="businessType"
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      required
                    >
                      <option value="">Select your industry...</option>
                      <option value="Auto Detailing">Auto Detailing</option>
                      <option value="Mobile Mechanic">Mobile Mechanic</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Plumber">Plumber</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Landscaping">Landscaping</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number (optional)
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Reserving Your Spot...' : 'Reserve Your Spot'}
                  </button>

                  <p className="text-sm text-gray-500 text-center">
                    We&apos;ll never share your information. Unsubscribe anytime.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Protect Your Reputation?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join the waitlist and be among the first to access ReviewFlo when we launch.
          </p>
          <button
            onClick={() => setShowWaitlist(true)}
            className="bg-white hover:bg-gray-100 text-blue-600 font-bold text-lg px-12 py-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-xl"
          >
            Join the Waitlist
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">ReviewFlo</h3>
              <p className="text-gray-400">
                Protecting your reputation, one review at a time.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <p className="text-gray-400">
                Email: hello@reviewflo.com
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/login" className="block text-gray-400 hover:text-white transition-colors">
                  Business Login
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>© 2025 ReviewFlo. All rights reserved.</p>
            <p className="mt-2">Powered by ReviewFlo</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
