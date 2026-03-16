import { useState } from 'react'

interface SendRequestModalProps {
  open: boolean
  businessName: string
  onClose: () => void
  onSuccess: () => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SendRequestModal({
  open,
  businessName,
  onClose,
  onSuccess,
}: SendRequestModalProps) {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [optionalNote, setOptionalNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!customerName.trim()) {
      setError('Customer name is required')
      return
    }
    if (!customerEmail.trim()) {
      setError('Customer email is required')
      return
    }
    if (!EMAIL_REGEX.test(customerEmail.trim())) {
      setError('Please enter a valid email address')
      return
    }
    if (optionalNote.length > 200) {
      setError('Optional note must be 200 characters or less')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession()
      if (!session) {
        setError('Session expired. Please log in again.')
        setIsSubmitting(false)
        return
      }

      const res = await fetch('/api/send-review-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          optionalNote: optionalNote.trim() || null,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to send request')
        setIsSubmitting(false)
        return
      }

      onSuccess()
      try {
        const { trackEvent } = await import('../lib/posthog-provider')
        trackEvent('review_request_sent', { requestMethod: 'email' })
      } catch { /* ignore */ }
      setCustomerName('')
      setCustomerEmail('')
      setOptionalNote('')
      onClose()
    } catch (err) {
      console.error('Send request error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Send Review Request</h2>
        <p className="text-sm text-slate-600 mb-6">
          Send a review request email to a customer for {businessName}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 mb-1">
              Customer Name *
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
              placeholder="John Smith"
              required
            />
          </div>
          <div>
            <label htmlFor="customerEmail" className="block text-sm font-medium text-slate-700 mb-1">
              Customer Email *
            </label>
            <input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
              placeholder="john@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="optionalNote" className="block text-sm font-medium text-slate-700 mb-1">
              Optional Note (max 200 chars)
            </label>
            <textarea
              id="optionalNote"
              value={optionalNote}
              onChange={(e) => setOptionalNote(e.target.value.slice(0, 200))}
              rows={3}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
              placeholder="Thanks for your service today!"
              maxLength={200}
            />
            <p className="text-xs text-slate-500 mt-1">{optionalNote.length}/200</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
