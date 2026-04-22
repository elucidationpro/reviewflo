/**
 * POST /api/google-reviews/reply
 * Posts or updates a reply to a Google review via GBP v4 API.
 * Body: { review_name: string, comment: string }
 * review_name is the full GBP resource path: accounts/{a}/locations/{l}/reviews/{r}
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuthContext, apiError, parseTier } from '../../../lib/api-utils'
import { canAccessGoogleStats } from '../../../lib/tier-permissions'
import { refreshAccessToken } from '../../../lib/google-business-profile'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return apiError(res, 405, 'Method not allowed')
  }

  const ctx = await getAuthContext(
    req,
    res,
    'id, tier, google_oauth_refresh_token'
  )
  if (!ctx) return

  const { business } = ctx
  const tier = parseTier(business.tier)

  if (!canAccessGoogleStats(tier)) {
    return apiError(res, 403, 'Pro or AI tier required to reply to reviews')
  }

  const refreshToken = business.google_oauth_refresh_token as string | null
  if (!refreshToken) {
    return apiError(res, 400, 'Google Business Profile not connected.')
  }

  const { review_name, comment } = req.body ?? {}

  if (!review_name || typeof review_name !== 'string' || !review_name.includes('/reviews/')) {
    return apiError(res, 400, 'Invalid review_name — must be the full GBP resource path')
  }
  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    return apiError(res, 400, 'Reply comment is required')
  }
  if (comment.length > 4096) {
    return apiError(res, 400, 'Reply exceeds 4096 character limit')
  }

  try {
    const { accessToken } = await refreshAccessToken(refreshToken)

    const url = `https://mybusiness.googleapis.com/v4/${review_name}/reply`
    console.log('[GBP_DEBUG] reply: PUT', url)

    const gbpRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ comment: comment.trim() }),
    })

    const responseBody = await gbpRes.json().catch(() => ({}))
    console.log('[GBP_DEBUG] reply: response status', gbpRes.status)

    if (!gbpRes.ok) {
      console.error('[GBP_DEBUG] reply: failed', { status: gbpRes.status, body: responseBody })
      return res.status(502).json({
        error: 'Reply failed',
        details: responseBody,
      })
    }

    return res.status(200).json({ success: true, reply: responseBody })
  } catch (err) {
    console.error('[GBP_DEBUG] reply: exception', {
      message: err instanceof Error ? err.message : String(err),
    })
    return apiError(res, 500, 'Internal server error posting reply')
  }
}
