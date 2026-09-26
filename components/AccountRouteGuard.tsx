import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/router'
import { checkIsAdmin } from '@/lib/adminAuth'
import { supabase } from '@/lib/supabase'

const clientRoutes = ['/dashboard', '/settings', '/account', '/feedback', '/onboarding', '/join/google-confirm', '/join/confirm-details', '/join/set-password']

/** Resolve the account surface before mounting any business onboarding/dashboard effects. */
export default function AccountRouteGuard({ children }: { children: ReactNode }) {
  const router = useRouter()
  const guarded = clientRoutes.some(path => router.pathname === path || router.pathname.startsWith(`${path}/`))
  const [verifiedPath, setVerifiedPath] = useState<string | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!guarded) return
    let active = true
    const check = async () => {
      try {
        const admin = await checkIsAdmin()
        if (!active) return
        if (admin) { await router.replace('/admin'); return }
        setVerifiedPath(router.pathname)
      } catch {
        if (active) setError(true)
      }
    }
    void check()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setVerifiedPath(null)
      // Do not call other auth methods while the auth event lock is held.
      setTimeout(() => { if (active) void check() }, 0)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [guarded, router.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  if (guarded && verifiedPath !== router.pathname) {
    return <div className="min-h-screen flex items-center justify-center"><p>{error ? 'Unable to verify account access. Refresh to try again.' : 'Checking account…'}</p></div>
  }
  return <>{children}</>
}
