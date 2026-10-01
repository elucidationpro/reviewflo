import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { useBusiness } from '@/contexts/BusinessContext'
import {
  clearPendingCheckoutSessionId,
  isValidCheckoutSessionId,
  loginRedirectTarget,
  resolvePlanLabel,
  savePendingCheckoutSessionId,
} from '@/lib/pending-checkout'
import type { VerifyCheckoutSessionResponse } from '../api/verify-checkout-session'

type ViewState =
  | { kind: 'loading' }
  | { kind: 'redirecting_to_login' }
  | { kind: 'auth_redirect_failed' }
  | { kind: 'sign_in_required_manual' }
  | { kind: 'invalid_session_id' }
  | { kind: 'verifying' }
  | { kind: 'confirmed'; billingInterval: string; plan: string }
  | { kind: 'payment_incomplete' }
  | { kind: 'sync_pending' }
  | { kind: 'sync_pending_exhausted' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }

const MAX_AUTO_RETRIES = 4
const AUTO_RETRY_DELAY_MS = 3000
const FETCH_TIMEOUT_MS = 10000

export default function CheckoutConfirmationPage() {
  const router = useRouter()
  const { refreshWithResult } = useBusiness()
  const [state, setState] = useState<ViewState>({ kind: 'loading' })
  const [refreshWarning, setRefreshWarning] = useState(false)
  const autoRetryCount = useRef(0)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestSeq = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  const rawSessionId = router.query.session_id
  const sessionId = typeof rawSessionId === 'string' ? rawSessionId : null

  const verify = useCallback(async () => {
    if (!sessionId) return
    const myRequest = ++requestSeq.current

    if (!isValidCheckoutSessionId(sessionId)) {
      clearPendingCheckoutSessionId()
      setState({ kind: 'invalid_session_id' })
      return
    }

    // Save the pending marker before doing any work so an auth loss mid-flow (e.g. an
    // expired session discovered below) leaves a recoverable trail back to this checkout.
    // If storage is blocked, the automatic post-login redirect can't be trusted to preserve
    // this session id, so `goToLogin` falls back to a manual, non-navigating recovery screen.
    const markerSaved = savePendingCheckoutSessionId(sessionId)

    const goToLogin = async () => {
      if (!markerSaved) {
        setState({ kind: 'sign_in_required_manual' })
        return
      }
      setState({ kind: 'redirecting_to_login' })
      try {
        await router.replace(loginRedirectTarget(sessionId))
      } catch {
        if (myRequest !== requestSeq.current) return
        setState({ kind: 'auth_redirect_failed' })
      }
    }

    let session: { access_token?: string } | null = null
    try {
      const result = await supabase.auth.getSession()
      session = result.data.session
    } catch {
      if (myRequest !== requestSeq.current) return
      setState({ kind: 'error', message: 'Could not check your sign-in status. Please try again.' })
      return
    }
    if (myRequest !== requestSeq.current) return

    if (!session?.access_token) {
      await goToLogin()
      return
    }

    setState({ kind: 'verifying' })

    const controller = new AbortController()
    abortRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch('/api/verify-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      if (myRequest !== requestSeq.current) return
      const timedOut = err instanceof DOMException && err.name === 'AbortError'
      setState({
        kind: 'error',
        message: timedOut
          ? 'The request timed out. Please try again.'
          : 'Network error. Check your connection and try again.',
      })
      return
    }

    // Keep the timeout alive through body consumption too — a stalled response body should
    // still be treated as a timeout, not left to hang indefinitely.
    let data: VerifyCheckoutSessionResponse & { error?: string; reason?: string }
    try {
      data = await res.json()
    } catch {
      clearTimeout(timeoutId)
      if (myRequest !== requestSeq.current) return
      setState({ kind: 'error', message: 'Received an invalid response from the server. Please try again.' })
      return
    }
    clearTimeout(timeoutId)
    if (myRequest !== requestSeq.current) return

    if (!res.ok) {
      if (res.status === 401) {
        await goToLogin()
        return
      }
      if (res.status === 403) {
        clearPendingCheckoutSessionId()
        setState({ kind: 'forbidden' })
        return
      }
      // Other failures (5xx, etc.) are treated as transient: keep the pending marker so a
      // retry (manual or after reload) can still resume verification.
      setState({ kind: 'error', message: data.error || 'Something went wrong confirming your upgrade.' })
      return
    }

    if (data.status === 'confirmed') {
      clearPendingCheckoutSessionId()
      setState({ kind: 'confirmed', billingInterval: data.billingInterval || 'month', plan: data.plan || 'pro' })
      try {
        const refreshed = await refreshWithResult()
        if (myRequest !== requestSeq.current) return
        setRefreshWarning(!refreshed)
      } catch {
        if (myRequest !== requestSeq.current) return
        setRefreshWarning(true)
      }
      return
    }

    if (data.status === 'payment_incomplete') {
      clearPendingCheckoutSessionId()
      setState({ kind: 'payment_incomplete' })
      return
    }

    // sync_pending: transient, keep the pending marker and retry automatically a few times.
    setState({ kind: 'sync_pending' })
  }, [sessionId, router, refreshWithResult])

  useEffect(() => {
    if (!router.isReady) return
    requestSeq.current += 1
    autoRetryCount.current = 0
    if (retryTimer.current) {
      clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
    if (!sessionId) {
      clearPendingCheckoutSessionId()
      setState({ kind: 'invalid_session_id' })
      return
    }
    verify()
    return () => {
      // Invalidate this call's requestSeq check first, so a getSession()/json() resolution
      // that was already past the abort signal's reach still gets ignored on unmount/session change.
      requestSeq.current += 1
      abortRef.current?.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, sessionId])

  useEffect(() => {
    if (state.kind !== 'sync_pending') return
    if (autoRetryCount.current >= MAX_AUTO_RETRIES) {
      setState({ kind: 'sync_pending_exhausted' })
      return
    }
    autoRetryCount.current += 1
    retryTimer.current = setTimeout(() => {
      verify()
    }, AUTO_RETRY_DELAY_MS)
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [state.kind, verify])

  const handleRetryRefresh = async () => {
    try {
      const refreshed = await refreshWithResult()
      setRefreshWarning(!refreshed)
    } catch {
      setRefreshWarning(true)
    }
  }

  const handleManualRetry = () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
    abortRef.current?.abort()
    autoRetryCount.current = 0
    verify()
  }

  const planLabel = state.kind === 'confirmed' ? resolvePlanLabel(state.plan) : 'Pro'

  return (
    <>
      <Head>
        <title>Confirming your upgrade - ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center">
          {(state.kind === 'loading' || state.kind === 'verifying' || state.kind === 'redirecting_to_login') && (
            <>
              <div className="flex items-center justify-center mb-4">
                <svg className="animate-spin h-8 w-8 text-[#4A3428]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Confirming your upgrade…</h1>
              <p className="text-sm text-gray-500">
                {state.kind === 'redirecting_to_login' ? 'Please sign in to finish confirming your upgrade.' : 'This only takes a moment.'}
              </p>
            </>
          )}

          {state.kind === 'auth_redirect_failed' && sessionId && (
            <>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Please sign in</h1>
              <p className="text-sm text-gray-500 mb-4">
                We couldn&apos;t automatically send you to the sign-in page. Use the link below — your checkout
                confirmation will pick back up once you&apos;re signed in.
              </p>
              <Link
                href={loginRedirectTarget(sessionId)}
                className="w-full inline-block bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Go to sign in
              </Link>
            </>
          )}

          {state.kind === 'sign_in_required_manual' && sessionId && (
            <>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Please sign in to continue</h1>
              <p className="text-sm text-gray-500 mb-4">
                We couldn&apos;t save your checkout progress in this browser, so we can&apos;t automatically bring
                you back here after signing in. Save this confirmation link, sign in, then return to it to finish.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/dashboard/checkout?session_id=${encodeURIComponent(sessionId)}`}
                  className="w-full inline-block bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Confirmation link
                </Link>
                <Link href={loginRedirectTarget(sessionId)} className="text-sm font-semibold text-[#4A3428] hover:underline">
                  Go to sign in
                </Link>
              </div>
            </>
          )}

          {state.kind === 'sync_pending' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <svg className="animate-spin h-8 w-8 text-[#4A3428]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Still checking your payment and plan</h1>
              <p className="text-sm text-gray-500 mb-4">
                We&apos;re verifying your checkout with Stripe. This usually only takes a few seconds.
              </p>
              <button
                type="button"
                onClick={handleManualRetry}
                className="text-sm font-semibold text-[#4A3428] hover:underline"
              >
                Retry verification
              </button>
            </>
          )}

          {state.kind === 'sync_pending_exhausted' && (
            <>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Still checking your payment and plan</h1>
              <p className="text-sm text-gray-500 mb-4">
                We&apos;re still verifying your checkout with Stripe, and it&apos;s taking longer than usual. You
                can try again now, or check back in a few minutes.
              </p>
              <button
                type="button"
                onClick={handleManualRetry}
                className="w-full bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Retry verification
              </button>
            </>
          )}

          {state.kind === 'confirmed' && (
            <>
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h1 className="text-lg font-bold text-gray-900 mb-1">You&apos;re upgraded to {planLabel}!</h1>
              <p className="text-sm text-gray-500 mb-1">
                Billed {state.billingInterval === 'year' ? 'annually' : 'monthly'}. Enjoy full access to every {planLabel} feature.
              </p>
              {refreshWarning && (
                <div className="mb-4">
                  <p className="text-xs text-amber-600 mb-2">
                    Your account is upgraded, but we couldn&apos;t refresh this screen automatically — reload the page if the dashboard still shows your old plan.
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryRefresh}
                    className="text-xs font-semibold text-[#4A3428] hover:underline"
                  >
                    Retry refresh
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-2 mt-4">
                <Link
                  href="/dashboard"
                  className="w-full bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Go to dashboard
                </Link>
                <Link href="/settings?section=plan" className="text-sm font-semibold text-[#4A3428] hover:underline">
                  View billing details
                </Link>
              </div>
            </>
          )}

          {state.kind === 'payment_incomplete' && (
            <>
              <h1 className="text-lg font-bold text-gray-900 mb-1">We couldn&apos;t confirm your payment</h1>
              <p className="text-sm text-gray-500 mb-4">
                This checkout session doesn&apos;t show as completed yet. Please check your billing details before
                starting a new checkout — if a charge did go through, retrying checkout again could charge you twice.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleManualRetry}
                  className="w-full bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Retry confirmation
                </button>
                <Link href="/settings?section=plan" className="text-sm font-semibold text-[#4A3428] hover:underline">
                  Check billing details
                </Link>
              </div>
            </>
          )}

          {(state.kind === 'forbidden' || state.kind === 'invalid_session_id') && (
            <>
              <h1 className="text-lg font-bold text-gray-900 mb-1">We couldn&apos;t verify that checkout</h1>
              <p className="text-sm text-gray-500 mb-4">
                This confirmation link may be invalid or may belong to a different account. If you just upgraded, check your billing details below.
              </p>
              <Link
                href="/settings?section=plan"
                className="w-full inline-block bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Back to plan settings
              </Link>
            </>
          )}

          {state.kind === 'error' && (
            <>
              <h1 className="text-lg font-bold text-gray-900 mb-1">Something went wrong</h1>
              <p className="text-sm text-gray-500 mb-4">{state.message}</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleManualRetry}
                  className="w-full bg-[#4A3428] hover:bg-[#4A3428]/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Retry
                </button>
                <Link href="/settings?section=plan" className="text-sm font-semibold text-[#4A3428] hover:underline">
                  Back to plan settings
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
