import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuthContext } from '@/lib/api-utils'
import { getAppBaseUrl } from '@/lib/app-base-url'
import { createConnectState } from '@/lib/google-connect-state'
import { setOAuthStateCookie } from '@/lib/google-oauth-csrf'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const ctx = await getAuthContext(req, res, 'id')
  if (!ctx) return
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) return res.status(503).json({ error: 'Google connection is unavailable' })
  const state = createConnectState(ctx.user.id, String(ctx.business.id), req.body?.onboarding === true)
  setOAuthStateCookie(res, state)
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({ client_id: clientId,
    redirect_uri: `${getAppBaseUrl(req)}/api/auth/google/callback`, response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage', state,
    access_type: 'offline', prompt: 'consent' }).toString()
  return res.status(200).json({ url: url.toString() })
}
