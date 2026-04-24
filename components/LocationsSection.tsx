import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMaxBusinessLocations } from '@/lib/tier-permissions'
import { generateLocationSlug } from '@/lib/slug-utils'
import { useBusiness, type LocationSummary } from '@/contexts/BusinessContext'

interface Props {
  tier: 'free' | 'pro' | 'ai'
  locations: LocationSummary[]
  maxLocations: number
  onChange: () => Promise<void>
}

export default function LocationsSection({ tier, locations, maxLocations, onChange }: Props) {
  const { setSelectedBusinessId } = useBusiness()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCity, setNewCity] = useState('')
  const [suggestion, setSuggestion] = useState<{ proposed: string; available: boolean; suggestion: string | null } | null>(null)
  const [checking, setChecking] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  const atCap = locations.length >= maxLocations
  const isPaid = tier === 'pro' || tier === 'ai'

  const livePreviewSlug = generateLocationSlug(newName, newCity)

  const resetAddForm = () => {
    setShowAdd(false)
    setNewName('')
    setNewCity('')
    setSuggestion(null)
    setError('')
  }

  const handleCheck = async () => {
    setError('')
    if (!newName.trim()) {
      setError('Business name is required')
      return
    }
    setChecking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired. Please log in again.')
        return
      }
      const res = await fetch('/api/businesses/check-slug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ businessName: newName.trim(), city: newCity.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Could not check availability')
        return
      }
      setSuggestion(data)
    } finally {
      setChecking(false)
    }
  }

  const handleAccept = async (slug: string) => {
    setError('')
    setAdding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expired. Please log in again.')
        return
      }
      const res = await fetch('/api/businesses/add-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ businessName: newName.trim(), slug }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to add location')
        return
      }
      await onChange()
      const newId = data?.location?.id as string | undefined
      resetAddForm()
      if (newId) setSelectedBusinessId(newId)
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (businessId: string) => {
    setRemoving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setRemoving(false)
        return
      }
      const res = await fetch('/api/businesses/remove-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ businessId }),
      })
      if (res.ok) {
        await onChange()
      }
      setConfirmDeleteId(null)
    } finally {
      setRemoving(false)
    }
  }

  const handleConnect = async (businessId: string) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID
    if (!clientId) return
    const redirectUri = `${window.location.origin}/api/auth/google/callback`
    const scope = 'https://www.googleapis.com/auth/business.manage'
    const stateValue = `${session.access_token}|${businessId}`
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scope)
    authUrl.searchParams.set('state', stateValue)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    window.location.href = authUrl.toString()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-900">Locations</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {maxLocations === 1
            ? `Your plan includes 1 location. ${tier === 'free' ? 'Upgrade to Pro (3) or AI (15) to add more.' : ''}`
            : `Your plan includes up to ${maxLocations} locations (${locations.length} used). Each location connects its own Google Business Profile.`}
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
        {locations.map((loc) => (
          <div key={loc.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 truncate">{loc.business_name}</span>
                {loc.is_primary && (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">Primary</span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">/{loc.slug}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {loc.google_connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Connected
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnect(loc.id)}
                  className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Connect GBP
                </button>
              )}
              {!loc.is_primary && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(loc.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isPaid && !atCap && !showAdd && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm font-semibold bg-[#4A3428] text-white rounded-lg hover:bg-[#4A3428]/90 transition-colors cursor-pointer"
        >
          + Add Location
        </button>
      )}

      {!isPaid && (
        <div className="rounded-xl border border-[#C9A961]/30 bg-gradient-to-br from-[#F5F5DC]/30 via-white to-white p-4">
          <p className="text-xs font-semibold text-[#C9A961] uppercase tracking-widest mb-1">Upgrade</p>
          <p className="text-sm text-gray-700">
            Add up to {getMaxBusinessLocations('pro')} locations on Pro or {getMaxBusinessLocations('ai')} on AI.
          </p>
        </div>
      )}

      {isPaid && atCap && (
        <p className="text-sm text-gray-500">
          You've reached the maximum of {maxLocations} locations for your plan.
        </p>
      )}

      {showAdd && (
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700">Business name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setSuggestion(null) }}
              placeholder="Obsidian Auto"
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A3428]/20"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">City <span className="font-normal text-gray-400">(optional)</span></label>
            <input
              type="text"
              value={newCity}
              onChange={(e) => { setNewCity(e.target.value); setSuggestion(null) }}
              placeholder="Columbus"
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A3428]/20"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              We'll generate a short review link for you
              {livePreviewSlug && !suggestion ? <> — preview: <code className="px-1 py-0.5 bg-gray-100 rounded">/{livePreviewSlug}</code></> : null}
            </p>
          </div>

          {suggestion?.available && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Available</p>
              <p className="text-sm text-gray-800 mt-1">
                Your review link will be <code className="px-1 py-0.5 bg-white border border-emerald-200 rounded">/{suggestion.suggestion}</code>
              </p>
            </div>
          )}

          {suggestion && !suggestion.available && suggestion.suggestion && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Taken</p>
              <p className="text-sm text-gray-800 mt-1">
                <code className="px-1 py-0.5 bg-white border border-amber-200 rounded">/{suggestion.proposed}</code> is taken.
                Next available: <code className="px-1 py-0.5 bg-white border border-amber-200 rounded">/{suggestion.suggestion}</code>
              </p>
            </div>
          )}

          {suggestion && !suggestion.available && !suggestion.suggestion && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Unavailable</p>
              <p className="text-sm text-gray-800 mt-1">
                We couldn't find an available link for this name. Try a different name or add a city.
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center gap-2">
            {!suggestion && (
              <button
                type="button"
                onClick={handleCheck}
                disabled={checking || !newName.trim()}
                className="px-4 py-2 text-sm font-semibold bg-[#4A3428] text-white rounded-lg hover:bg-[#4A3428]/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {checking ? 'Checking…' : 'Continue'}
              </button>
            )}
            {suggestion?.suggestion && (
              <button
                type="button"
                onClick={() => handleAccept(suggestion.suggestion as string)}
                disabled={adding}
                className="px-4 py-2 text-sm font-semibold bg-[#4A3428] text-white rounded-lg hover:bg-[#4A3428]/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {adding ? 'Creating…' : suggestion.available ? 'Accept & Create' : 'Use this link'}
              </button>
            )}
            {suggestion && (
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                disabled={adding}
                className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Try different name
              </button>
            )}
            <button
              type="button"
              onClick={resetAddForm}
              disabled={adding}
              className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !removing && setConfirmDeleteId(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-gray-900">Remove location?</h3>
            <p className="text-sm text-gray-600 mt-2">
              This permanently deletes the location, its review requests, templates, and Google connection. This cannot be undone.
            </p>
            <div className="flex items-center gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={removing}
                className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRemove(confirmDeleteId)}
                disabled={removing}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
