/**
 * ExportCaseStudy
 * Button + modal for downloading a professional case study.
 */
import { useState } from 'react'

interface ExportCaseStudyProps {
  primaryColor?: string
}

export default function ExportCaseStudy({ primaryColor = '#4A3428' }: ExportCaseStudyProps) {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState<30 | 60 | 90>(30)
  const [testimonial, setTestimonial] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleExport = async () => {
    setError('')
    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated.')
        return
      }

      const res = await fetch('/api/analytics/export-case-study', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ days, testimonial }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Export failed.')
        return
      }

      // Download the HTML file
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reviewflo-case-study.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export Case Study
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 z-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Export Case Study</h2>
            <p className="text-sm text-gray-500 mb-5">
              Generates a professional one-pager with your metrics. Opens as HTML — print to PDF from your browser.
            </p>

            {/* Time period */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <div className="flex gap-2">
                {([30, 60, 90] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      days === d ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    style={days === d ? { backgroundColor: primaryColor } : undefined}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            {/* Testimonial */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Testimonial <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={testimonial}
                onChange={(e) => setTestimonial(e.target.value)}
                placeholder="e.g., ReviewFlo helped us get 15 new Google reviews in the first month..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              />
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-opacity disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? 'Generating...' : '⬇ Download Case Study'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
