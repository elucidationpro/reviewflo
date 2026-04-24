import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

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
  loading: boolean
  refresh: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextValue | null>(null)

const STORAGE_KEY = 'reviewflo.selectedBusinessId'

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [primary, setPrimary] = useState<PrimaryBusiness | null>(null)
  const [locations, setLocations] = useState<LocationSummary[]>([])
  const [maxLocations, setMaxLocations] = useState<number>(1)
  const [selectedBusinessId, setSelectedBusinessIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchBusiness = useCallback(async (businessIdOverride?: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setPrimary(null)
        setLocations([])
        setMaxLocations(1)
        setSelectedBusinessIdState(null)
        setLoading(false)
        return
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
        return
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
      }
    } finally {
      setLoading(false)
    }
  }, [])

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

  const value: BusinessContextValue = {
    primary,
    locations,
    maxLocations,
    selectedBusinessId,
    setSelectedBusinessId,
    loading,
    refresh: fetchBusiness,
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
