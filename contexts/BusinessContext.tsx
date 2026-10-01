import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { readPendingCheckoutSessionId } from '@/lib/pending-checkout'

export interface LocationSummary {
  id: string
  business_name: string
  slug: string
  is_primary: boolean
  google_connected: boolean
  google_business_name: string | null
}

interface PrimaryBusiness {
  id: string
  business_name?: string | null
  tier?: 'free' | 'pro' | 'ai'
  google_connected?: boolean
  [key: string]: unknown
}

interface BusinessContextValue {
  primary: PrimaryBusiness | null
  locations: LocationSummary[]
  maxLocations: number
  selectedBusinessId: string | null
  setSelectedBusinessId: (id: string) => void
  viewMode: 'single' | 'all'
  setViewMode: (mode: 'single' | 'all') => void
  loading: boolean
  refresh: () => Promise<void>
  /** Same as `refresh`, but reports whether the refetch actually succeeded — callers that need
   * to distinguish "refetch failed" from "refetch ran and tier is still not updated yet" (e.g.
   * checkout confirmation) should use this instead of inferring success from the absence of a
   * thrown exception, which `refresh`/`fetchBusiness` never throw. */
  refreshWithResult: () => Promise<boolean>
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

const STORAGE_KEY = 'reviewflo.selectedBusinessId'
const VIEW_MODE_KEY = 'reviewflo.viewMode'

export function BusinessProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [primary, setPrimary] = useState<PrimaryBusiness | null>(null)
  const [locations, setLocations] = useState<LocationSummary[]>([])
  const [maxLocations, setMaxLocations] = useState<number>(1)
  const [selectedBusinessId, setSelectedBusinessIdState] = useState<string | null>(null)
  const [viewMode, setViewModeState] = useState<'single' | 'all'>('single')
  const [loading, setLoading] = useState(true)

  const fetchBusiness = useCallback(async (businessIdOverride?: string | null): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setPrimary(null)
        setLocations([])
        setMaxLocations(1)
        setSelectedBusinessIdState(null)
        setLoading(false)
        return false
      }

      const url = businessIdOverride
        ? `/api/my-business?businessId=${encodeURIComponent(businessIdOverride)}`
        : '/api/my-business'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        setPrimary(null)
        setLocations([])
        setMaxLocations(1)
        setSelectedBusinessIdState(null)
        setLoading(false)
        return false
      }

      const data = await res.json() as {
        business: PrimaryBusiness | null
        locations: LocationSummary[]
        maxLocations: number
      }

      setPrimary(data.business)
      setLocations(data.locations || [])
      setMaxLocations(data.maxLocations || 1)

      // Only seed selectedBusinessId on first load (no override passed).
      if (!businessIdOverride) {
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
        const validStored = stored && data.locations?.some((l) => l.id === stored) ? stored : null
        const fallback = data.business?.id ?? null
        setSelectedBusinessIdState(validStored ?? fallback)

        // Seed viewMode: prefer stored value if valid, else default to 'all' when multiple locations exist
        const storedMode = typeof window !== 'undefined' ? window.localStorage.getItem(VIEW_MODE_KEY) : null
        const resolvedMode: 'single' | 'all' =
          storedMode === 'single' || storedMode === 'all'
            ? storedMode
            : (data.locations?.length ?? 0) > 1
            ? 'all'
            : 'single'
        setViewModeState(resolvedMode)

        // Resume a checkout confirmation interrupted by a sign-in that dropped the original
        // `?redirect=` (Google login / magic link always land on a fixed destination). Only
        // fires from the ordinary dashboard/settings landing spots, never mid auth-callback.
        const pendingSessionId = readPendingCheckoutSessionId()
        if (pendingSessionId && (router.pathname === '/dashboard' || router.pathname === '/settings')) {
          router.replace(`/dashboard/checkout?session_id=${encodeURIComponent(pendingSessionId)}`)
        }
      }
      return true
    } catch {
      console.error('fetchBusiness failed')
      setPrimary(null)
      setLocations([])
      setMaxLocations(1)
      setSelectedBusinessIdState(null)
      return false
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchBusiness()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchBusiness()
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [fetchBusiness])

  // Re-fetch the selected location's full row whenever selection changes.
  useEffect(() => {
    if (!selectedBusinessId || !primary) return
    if (selectedBusinessId === primary.id) return
    fetchBusiness(selectedBusinessId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusinessId])

  const setSelectedBusinessId = useCallback((id: string) => {
    setSelectedBusinessIdState(id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, id)
    }
  }, [])

  const setViewMode = useCallback((mode: 'single' | 'all') => {
    setViewModeState(mode)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_MODE_KEY, mode)
    }
  }, [])

  const refresh = useCallback(async () => {
    await fetchBusiness()
  }, [fetchBusiness])

  const refreshWithResult = useCallback(() => fetchBusiness(), [fetchBusiness])

  const value: BusinessContextValue = {
    primary,
    locations,
    maxLocations,
    selectedBusinessId,
    setSelectedBusinessId,
    viewMode,
    setViewMode,
    loading,
    refresh,
    refreshWithResult,
  }

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) {
    throw new Error('useBusiness must be used within a BusinessProvider')
  }
  return ctx
}

export function useBusinessOptional(): BusinessContextValue | null {
  return useContext(BusinessContext)
}
