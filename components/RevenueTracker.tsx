/**
 * RevenueTracker
 * Manual entry form for revenue attribution tracking.
 * Shows recent entries and this month's summary.
 */
import { useState, useEffect, useCallback } from 'react'

interface SaleEntry {
  id: string
  customer_name: string | null
  sale_amount: number
  sale_date: string
  attribution_source: string
  notes: string | null
  created_at: string
}

interface SourceData {
  count: number
  revenue: number
  percentage: number
}

interface MonthSummary {
  google_review_customers: number
  google_review_revenue: number
  total_customers: number
  total_revenue: number
  attribution_percentage: number
}

const SOURCE_LABELS: Record<string, string> = {
  google_reviews: '⭐ Google Reviews',
  facebook: '📘 Facebook',
  referral: '🤝 Referral',
  repeat_customer: '🔄 Repeat Customer',
  other: '📋 Other',
}

const SOURCE_COLORS: Record<string, string> = {
  google_reviews: 'bg-yellow-100 text-yellow-800',
  facebook: 'bg-blue-100 text-blue-800',
  referral: 'bg-green-100 text-green-800',
  repeat_customer: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-700',
}

interface RevenueTrackerProps {
  primaryColor?: string
}

export default function RevenueTracker({ primaryColor = '#4A3428' }: RevenueTrackerProps) {
  const [entries, setEntries] = useState<SaleEntry[]>([])
  const [summary, setSummary] = useState<MonthSummary | null>(null)
  const [sourceBreakdown, setSourceBreakdown] = useState<Record<string, SourceData>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Form state
  const [customerName, setCustomerName] = useState('')
  const [saleAmount, setSaleAmount] = useState('')
  const [attributionSource, setAttributionSource] = useState('google_reviews')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const fetchSummary = useCallback(async () => {
    try {
      const { supabase } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/revenue/summary', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setSummary(data.summary)
        setSourceBreakdown(data.sourceBreakdown || {})
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    const amount = parseFloat(saleAmount)
    if (!saleAmount || isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid sale amount.')
      return
    }

    setSubmitting(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setErrorMsg('Not authenticated.')
        return
      }

      const res = await fetch('/api/revenue/add-sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerName: customerName.trim() || undefined,
          saleAmount: amount,
          attributionSource,
          saleDate,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save sale.')
        return
      }

      setSuccessMsg('Sale recorded!')
      setCustomerName('')
      setSaleAmount('')
      setNotes('')
      setSaleDate(new Date().toISOString().split('T')[0])
      setAttributionSource('google_reviews')
      setTimeout(() => setSuccessMsg(''), 3000)

      await fetchSummary()
    } catch {
      setErrorMsg('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const thisMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Month Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">
              {formatCurrency(summary.google_review_revenue)}
            </div>
            <div className="text-xs text-yellow-600 mt-1">From Reviews</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">
              {formatCurrency(summary.total_revenue)}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total Revenue</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">
              {summary.google_review_customers}
            </div>
            <div className="text-xs text-gray-500 mt-1">Review Customers</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">
              {summary.attribution_percentage}%
            </div>
            <div className="text-xs text-gray-500 mt-1">From Reviews</div>
          </div>
        </div>
      )}

      {/* Add Sale Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Log a Sale</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Name <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sale Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
                  placeholder="250"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How did they find you? <span className="text-red-500">*</span>
              </label>
              <select
                value={attributionSource}
                onChange={(e) => setAttributionSource(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 bg-white"
              >
                <option value="google_reviews">⭐ Google Reviews</option>
                <option value="facebook">📘 Facebook</option>
                <option value="referral">🤝 Referral</option>
                <option value="repeat_customer">🔄 Repeat Customer</option>
                <option value="other">📋 Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., New HVAC install"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
            />
          </div>

          {errorMsg && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</div>
          )}
          {successMsg && (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">✓ {successMsg}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-2.5 text-white text-sm font-medium rounded-lg transition-opacity disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? 'Saving...' : '+ Add Sale'}
          </button>
        </form>
      </div>

      {/* Source Breakdown */}
      {Object.keys(sourceBreakdown).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">{thisMonth} — Revenue by Source</h3>
          <div className="space-y-3">
            {Object.entries(sourceBreakdown)
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .map(([source, data]) => (
                <div key={source} className="flex items-center gap-3">
                  <div className="w-36 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${SOURCE_COLORS[source] || 'bg-gray-100 text-gray-700'}`}>
                      {SOURCE_LABELS[source] || source}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${data.percentage}%`,
                          backgroundColor: source === 'google_reviews' ? '#FBBF24' : primaryColor,
                          opacity: source === 'google_reviews' ? 1 : 0.6,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-28 flex-shrink-0 text-right">
                    <span className="text-sm font-semibold text-gray-700">{formatCurrency(data.revenue)}</span>
                    <span className="text-xs text-gray-400 ml-1">({data.percentage}%)</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Sales</h3>
          {loading ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${SOURCE_COLORS[entry.attribution_source] || 'bg-gray-100 text-gray-700'}`}>
                      {SOURCE_LABELS[entry.attribution_source] || entry.attribution_source}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm text-gray-700 truncate">
                        {entry.customer_name || 'Customer'}
                        {entry.notes && <span className="text-gray-400 ml-1">— {entry.notes}</span>}
                      </div>
                      <div className="text-xs text-gray-400">{formatDate(entry.sale_date)}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 flex-shrink-0 ml-4">
                    {formatCurrency(parseFloat(String(entry.sale_amount)))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
