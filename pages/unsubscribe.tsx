import { useState } from 'react'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { createClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken } from '../lib/campaign-tokens'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

interface PageProps {
  status: 'valid' | 'invalid'
  token: string | null
  businessName: string | null
  identifier: string | null
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  const raw = ctx.query.token
  const token = typeof raw === 'string' ? raw : ''
  if (!token) {
    return { props: { status: 'invalid', token: null, businessName: null, identifier: null } }
  }

  const payload = verifyUnsubscribeToken(token)
  if (!payload) {
    return { props: { status: 'invalid', token: null, businessName: null, identifier: null } }
  }

  let businessName: string | null = null
  try {
    const { data } = await supabaseAdmin
      .from('businesses')
      .select('business_name')
      .eq('id', payload.businessId)
      .single()
    businessName = data?.business_name ?? null
  } catch {
    /* fall through */
  }

  return {
    props: {
      status: 'valid',
      token,
      businessName,
      identifier: payload.email ?? payload.phone ?? null,
    },
  }
}

export default function UnsubscribePage({ status, token, businessName, identifier }: PageProps) {
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!token) return
    setConfirming(true)
    setError(null)
    try {
      const res = await fetch('/api/campaigns/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(json.error || 'Failed to unsubscribe')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsubscribe')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <>
      <Head>
        <title>Unsubscribe — ReviewFlo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <main className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-md bg-white rounded-2xl border border-[#4A3428]/10 p-8"
          style={{ boxShadow: '0 1px 4px rgba(74,52,40,0.07), 0 1px 2px rgba(74,52,40,0.04)' }}
        >
          {status === 'invalid' ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Link expired</h1>
              <p className="text-sm text-gray-600">
                This unsubscribe link is invalid or has expired. If you no longer wish to receive
                emails, please reply directly to the message you received.
              </p>
            </>
          ) : done ? (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">You&apos;re unsubscribed</h1>
              <p className="text-sm text-gray-600">
                You won&apos;t receive any more messages from{' '}
                <span className="font-semibold">{businessName ?? 'this business'}</span> via
                ReviewFlo.
              </p>
              <p className="text-xs text-gray-400 mt-4">
                If this was a mistake, reply to one of their emails and they can add you back.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Unsubscribe</h1>
              <p className="text-sm text-gray-600 mb-1">
                Stop receiving review-request emails from{' '}
                <span className="font-semibold">{businessName ?? 'this business'}</span>?
              </p>
              {identifier && (
                <p className="text-xs text-gray-400 mb-6">For: {identifier}</p>
              )}
              {error && (
                <p className="text-sm text-red-600 mb-3">{error}</p>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4A3428] hover:bg-[#4A3428]/90 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {confirming ? 'Unsubscribing…' : 'Confirm unsubscribe'}
              </button>
            </>
          )}
        </div>
      </main>
    </>
  )
}
