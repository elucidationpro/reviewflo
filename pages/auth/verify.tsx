import type { GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

/**
 * Redirect route that wraps Supabase auth links.
 * Emails link to usereviewflo.com/auth/verify?r=<encoded_url> instead of
 * supabase.co directly, which improves deliverability (link domain matches sender).
 * We validate the URL points to our Supabase project before redirecting.
 */
export default function AuthVerifyPage() {
  const router = useRouter()
  const { r } = router.query

  useEffect(() => {
    if (typeof r !== 'string') return
    try {
      const decoded = decodeBase64Url(r)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      if (decoded.startsWith(supabaseUrl)) {
        window.location.href = decoded
        return
      }
    } catch {
      // Fall through to error
    }
    router.replace('/login?error=invalid_link')
  }, [r, router])

  return (
    <div style={{ fontFamily: 'system-ui', textAlign: 'center', padding: '2rem' }}>
      <p>Redirecting to set your password…</p>
      <p style={{ color: '#6b7280', fontSize: '14px' }}>
        If you&apos;re not redirected, <a href="/login">go to login</a>.
      </p>
    </div>
  )
}

// Optional: server-side redirect for faster UX and crawlers
export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const r = ctx.query.r
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  if (typeof r === 'string' && supabaseUrl) {
    try {
      const decoded = decodeBase64Url(r)
      if (decoded.startsWith(supabaseUrl)) {
        return { redirect: { destination: decoded, permanent: false } }
      }
    } catch {
      // Fall through
    }
  }

  return { redirect: { destination: '/login?error=invalid_link', permanent: false } }
}

function decodeBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4
  if (pad) base64 += '='.repeat(4 - pad)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf-8')
  }
  // Supabase URLs are ASCII; atob handles them
  return atob(base64)
}
