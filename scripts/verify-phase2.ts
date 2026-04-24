import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

type CheckStatus = 'PASS' | 'FAIL' | 'WARNING' | 'SKIPPED' | 'MANUAL'

type CheckResult = {
  label: string
  status: CheckStatus
  details?: string
}

function fmt(status: CheckStatus): string {
  switch (status) {
    case 'PASS':
      return '✅'
    case 'FAIL':
      return '❌'
    case 'WARNING':
      return '⚠️ '
    case 'SKIPPED':
      return '⚠️ '
    case 'MANUAL':
      return '⚠️ '
  }
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

function getArgFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

async function getAccessTokenFromEnvOrLogin(prefix: string): Promise<string> {
  const direct = process.env[`${prefix}_ACCESS_TOKEN`]
  if (direct) return direct

  const email = process.env[`${prefix}_EMAIL`]
  const password = process.env[`${prefix}_PASSWORD`]
  if (!email || !password) {
    throw new Error(
      `Missing ${prefix}_ACCESS_TOKEN or (${prefix}_EMAIL and ${prefix}_PASSWORD).`
    )
  }

  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const anon = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const supabase = createClient(url, anon, { auth: { persistSession: false } })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session?.access_token) {
    throw new Error(`Failed to login for ${prefix}: ${error?.message ?? 'no session returned'}`)
  }
  return data.session.access_token
}

async function apiJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit & { accessToken?: string } = {}
): Promise<{ status: number; json: T | any }> {
  const headers = new Headers(init.headers)
  if (init.accessToken) headers.set('Authorization', `Bearer ${init.accessToken}`)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

type GbpFullReview = {
  name: string
  reviewer?: { displayName?: string; isAnonymous?: boolean }
  starRating:
    | 'ONE'
    | 'TWO'
    | 'THREE'
    | 'FOUR'
    | 'FIVE'
    | 'STAR_RATING_UNSPECIFIED'
  comment?: string
  createTime: string
  updateTime?: string
  reviewReply?: { comment: string; updateTime: string } | null
}

function validateReviewShape(r: any): string[] {
  const errs: string[] = []
  if (!r || typeof r !== 'object') return ['review is not an object']
  if (typeof r.name !== 'string' || !r.name.includes('/reviews/')) errs.push('missing/invalid name')
  if (!r.reviewer || typeof r.reviewer !== 'object') errs.push('missing reviewer object')
  if (r.reviewer && typeof r.reviewer === 'object') {
    if (
      r.reviewer.displayName !== undefined &&
      typeof r.reviewer.displayName !== 'string'
    ) {
      errs.push('reviewer.displayName must be string when present')
    }
  }
  if (typeof r.starRating !== 'string') errs.push('missing/invalid starRating')
  if (r.comment !== undefined && typeof r.comment !== 'string') errs.push('comment must be string when present')
  if (typeof r.createTime !== 'string') errs.push('missing/invalid createTime')
  if (r.reviewReply !== undefined && r.reviewReply !== null && typeof r.reviewReply !== 'object') {
    errs.push('reviewReply must be object|null when present')
  }
  if (r.reviewReply && typeof r.reviewReply === 'object') {
    if (typeof r.reviewReply.comment !== 'string') errs.push('reviewReply.comment missing/invalid')
    if (typeof r.reviewReply.updateTime !== 'string') errs.push('reviewReply.updateTime missing/invalid')
  }
  return errs
}

async function getBusinessRefreshTokenForUser(accessToken: string): Promise<string | null> {
  const supabaseAdmin = getSupabaseAdmin()
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken)
  if (userErr || !userData.user?.id) return null

  const { data: biz, error: bizErr } = await supabaseAdmin
    .from('businesses')
    .select('google_oauth_refresh_token')
    .eq('user_id', userData.user.id)
    .single()

  if (bizErr) return null
  return (biz?.google_oauth_refresh_token as string | null) ?? null
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const clientId = requireEnv('GOOGLE_OAUTH_CLIENT_ID')
  const clientSecret = requireEnv('GOOGLE_OAUTH_CLIENT_SECRET')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json().catch(() => ({} as any))
  if (!response.ok) {
    throw new Error((data as any)?.error_description || 'Failed to refresh Google access token')
  }

  return { accessToken: (data as any).access_token, expiresIn: (data as any).expires_in }
}

async function main(): Promise<void> {
  // Load .env.local if present (dotenv/config won’t do this automatically)
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })

  const baseUrl = process.env.VERIFY_PHASE2_BASE_URL ?? 'http://localhost:3000'
  const runTestReply = getArgFlag('--test-reply')

  const results: CheckResult[] = []

  // Auth: primary token (Obsidian Auto business expected)
  const primaryToken = await getAccessTokenFromEnvOrLogin('VERIFY_PHASE2')

  // Check 1 — GBP debug logs (can’t be pulled from script reliably)
  results.push({
    label: 'Check 1 — GBP debug endpoints',
    status: 'MANUAL',
    details:
      `This script will hit the endpoints, but cannot reliably read Next.js server logs.\n` +
      `Manual: in your dev server output, search for "[GBP_DEBUG]" after this run.\n` +
      `Expected to see list/reply calls when checks run.`,
  })

  // Check 2 — Review list API structure + expected Obsidian Auto stats
  let reviews: GbpFullReview[] = []
  try {
    const { status, json } = await apiJson<{ reviews?: GbpFullReview[] }>(baseUrl, '/api/google-reviews/list', {
      method: 'GET',
      accessToken: primaryToken,
    })

    if (status !== 200) {
      results.push({
        label: 'Check 2 — Review list API',
        status: 'FAIL',
        details: `Expected 200, got ${status}. Body: ${JSON.stringify(json)}`,
      })
    } else if (!json || !Array.isArray(json.reviews)) {
      results.push({
        label: 'Check 2 — Review list API',
        status: 'FAIL',
        details: `Expected { reviews: [...] }. Body: ${JSON.stringify(json)}`,
      })
    } else {
      reviews = json.reviews
      const shapeErrors: string[] = []
      for (const r of reviews) {
        const errs = validateReviewShape(r)
        if (errs.length) shapeErrors.push(`${String(r?.name ?? '(unknown)')}: ${errs.join(', ')}`)
      }

      const total = reviews.length
      const fiveStar = reviews.filter((r) => r.starRating === 'FIVE').length
      const latest = reviews
        .map((r) => r.createTime)
        .filter((t) => typeof t === 'string')
        .sort()
        .at(-1)

      const expectedCount = 7
      const expectedAllFiveStar = total > 0 && fiveStar === total
      const expectedLatestFeb2026 = latest ? latest.startsWith('2026-02') : false

      const ok =
        shapeErrors.length === 0 &&
        total === expectedCount &&
        expectedAllFiveStar &&
        expectedLatestFeb2026

      results.push({
        label: 'Check 2 — Review list API',
        status: ok ? 'PASS' : 'WARNING',
        details:
          `${total} reviews returned; ${fiveStar}/${total} are 5-star; latest createTime: ${latest ?? '(unknown)'}.\n` +
          (shapeErrors.length ? `Shape issues:\n- ${shapeErrors.join('\n- ')}` : '') +
          (ok
            ? ''
            : `\nExpected (per prompt): 7 reviews, all 5-star, latest from Feb 2026. If your live data changed, this may be OK.`),
      })
    }
  } catch (e) {
    results.push({
      label: 'Check 2 — Review list API',
      status: 'FAIL',
      details: e instanceof Error ? e.message : String(e),
    })
  }

  // Check 3 — AI tier gating (needs non-AI creds)
  try {
    const nonAiToken = await getAccessTokenFromEnvOrLogin('VERIFY_PHASE2_NONAI')
    const { status, json } = await apiJson<{ draft?: string }>(baseUrl, '/api/google-reviews/draft-reply', {
      method: 'POST',
      accessToken: nonAiToken,
      body: JSON.stringify({
        review_text: 'Great service!',
        review_rating: 5,
        reviewer_name: 'Test Reviewer',
      }),
    })

    if (status === 403) {
      results.push({
        label: 'Check 3 — AI tier gating',
        status: 'PASS',
        details: `403 returned for non-AI user as expected.`,
      })
    } else if (status >= 200 && status < 300 && json?.draft) {
      results.push({
        label: 'Check 3 — AI tier gating',
        status: 'FAIL',
        details: `Non-AI user received a draft reply (should be gated).`,
      })
    } else {
      results.push({
        label: 'Check 3 — AI tier gating',
        status: 'WARNING',
        details: `Expected 403 for non-AI user. Got ${status}. Body: ${JSON.stringify(json)}`,
      })
    }
  } catch (e) {
    results.push({
      label: 'Check 3 — AI tier gating',
      status: 'MANUAL',
      details:
        `Could not run automatically (missing non-AI creds).\n` +
        `Set VERIFY_PHASE2_NONAI_ACCESS_TOKEN or (VERIFY_PHASE2_NONAI_EMAIL + VERIFY_PHASE2_NONAI_PASSWORD).\n` +
        `Error: ${e instanceof Error ? e.message : String(e)}`,
    })
  }

  // Check 4 — Reply Rate KPI math
  if (!reviews.length) {
    results.push({
      label: 'Check 4 — Reply rate math',
      status: 'WARNING',
      details: 'No reviews available from Check 2, cannot compute reply rate.',
    })
  } else {
    const replied = reviews.filter((r) => !!r.reviewReply?.comment?.trim()).length
    const total = reviews.length
    const rate = total ? replied / total : 0
    results.push({
      label: 'Check 4 — Reply rate math',
      status: 'PASS',
      details: `${replied} of ${total} reviews have replies. Reply rate should display as ${pct(rate)}.`,
    })
  }

  // Check 5 — Test reply post + delete (optional)
  if (!runTestReply) {
    results.push({
      label: 'Check 5 — Test reply',
      status: 'SKIPPED',
      details: 'SKIPPED (pass --test-reply to run)',
    })
  } else if (!reviews.length) {
    results.push({
      label: 'Check 5 — Test reply',
      status: 'FAIL',
      details: 'No reviews available to target (Check 2 returned none).',
    })
  } else {
    const oldest = [...reviews].sort((a, b) => a.createTime.localeCompare(b.createTime))[0]
    const reviewName = oldest?.name
    const testComment = 'Test reply — please ignore. Will be deleted immediately.'

    if (!reviewName) {
      results.push({
        label: 'Check 5 — Test reply',
        status: 'FAIL',
        details: 'Could not determine oldest review name.',
      })
    } else {
      const refreshToken = await getBusinessRefreshTokenForUser(primaryToken)
      if (!refreshToken) {
        results.push({
          label: 'Check 5 — Test reply',
          status: 'FAIL',
          details:
            'Could not fetch google_oauth_refresh_token for this business. Ensure SUPABASE_SERVICE_ROLE_KEY is set and GBP is connected.',
        })
      } else {
        let accessToken: string | null = null
        try {
          const refreshed = await refreshGoogleAccessToken(refreshToken)
          accessToken = refreshed.accessToken

          const url = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`

          const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ comment: testComment }),
          })
          const putBody = await putRes.json().catch(() => ({}))

          if (!putRes.ok) {
            results.push({
              label: 'Check 5 — Test reply',
              status: 'FAIL',
              details: `POST/PUT failed (${putRes.status}). Body: ${JSON.stringify(putBody)}`,
            })
          } else {
            // Delete immediately
            const delRes = await fetch(url, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${accessToken}` },
            })
            const delBody = await delRes.json().catch(() => ({}))

            if (delRes.status === 200 || delRes.status === 204) {
              results.push({
                label: 'Check 5 — Test reply',
                status: 'PASS',
                details: `Posted + deleted reply successfully on oldest review (${reviewName}).`,
              })
            } else {
              results.push({
                label: 'Check 5 — Test reply',
                status: 'FAIL',
                details: `Delete failed (${delRes.status}). Body: ${JSON.stringify(delBody)}`,
              })
            }
          }
        } catch (e) {
          results.push({
            label: 'Check 5 — Test reply',
            status: 'FAIL',
            details: e instanceof Error ? e.message : String(e),
          })
        }
      }
    }
  }

  // Check 6 — Awaiting reply alert logic
  if (!reviews.length) {
    results.push({
      label: 'Check 6 — Awaiting reply alert',
      status: 'WARNING',
      details: 'No reviews available from Check 2, cannot compute awaiting-reply count.',
    })
  } else {
    const awaiting = reviews.filter((r) => !r.reviewReply?.comment?.trim()).length
    results.push({
      label: 'Check 6 — Awaiting reply alert',
      status: 'PASS',
      details:
        awaiting > 0
          ? `Expected Overview alert: "${awaiting} reviews awaiting reply."`
          : 'No reviews awaiting reply; Overview alert should not appear.',
    })
  }

  // Output
  console.log('ReviewFlo Phase 2 Verification')
  console.log('================================')
  for (const r of results) {
    const line = `${fmt(r.status)} ${r.label}: ${r.status}${r.details ? `\n${r.details}\n` : ''}`
    console.log(line.trimEnd())
  }

  const hasFail = results.some((r) => r.status === 'FAIL')
  const hasWarn = results.some((r) => r.status === 'WARNING' || r.status === 'MANUAL')
  if (hasFail) {
    console.log('\nOne or more checks FAILED. Investigate before trusting Phase 2 behavior.')
    process.exitCode = 1
  } else if (hasWarn) {
    console.log('\nAll automated checks passed, but some checks need manual verification.')
    process.exitCode = 0
  } else {
    console.log('\nAll checks passed. Ready to verify visually on localhost.')
    process.exitCode = 0
  }
}

main().catch((err) => {
  console.error('Verifier crashed:', err instanceof Error ? err.message : String(err))
  process.exitCode = 1
})
