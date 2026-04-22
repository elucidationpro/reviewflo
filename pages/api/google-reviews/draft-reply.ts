/**
 * POST /api/google-reviews/draft-reply
 * Generates an AI-drafted reply to a Google review. AI tier only.
 * Body: { review_text: string, review_rating: number, reviewer_name: string }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { getAuthContext, apiError, parseTier, supabaseAdmin } from '../../../lib/api-utils'
import { canUseAIFeatures } from '../../../lib/tier-permissions'
import { generateReviewReplyDraft } from '../../../lib/claude'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return apiError(res, 405, 'Method not allowed')
  }

  const ctx = await getAuthContext(req, res, 'id, business_name, tier')
  if (!ctx) return

  const { business } = ctx
  const tier = parseTier(business.tier)

  if (!canUseAIFeatures(tier)) {
    return apiError(res, 403, 'AI drafts available on AI tier only.')
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return apiError(res, 500, 'ANTHROPIC_API_KEY not configured')
  }

  const { review_text, review_rating, reviewer_name } = req.body ?? {}

  if (typeof review_rating !== 'number' || review_rating < 1 || review_rating > 5) {
    return apiError(res, 400, 'review_rating must be a number 1-5')
  }
  if (typeof reviewer_name !== 'string') {
    return apiError(res, 400, 'reviewer_name is required')
  }

  const result = await generateReviewReplyDraft({
    businessName: business.business_name as string,
    reviewText: review_text ?? '',
    reviewRating: review_rating,
    reviewerName: reviewer_name,
    quota: {
      businessId: business.id as string,
      supabase: supabaseAdmin,
      tier,
    },
  })

  if (result.quotaExceeded) {
    return apiError(res, 429, 'Monthly AI token quota exceeded')
  }

  if (!result.success || !result.content) {
    console.error('[draft-reply] generation failed:', result.error)
    return apiError(res, 500, 'Failed to generate draft reply')
  }

  return res.status(200).json({ draft: result.content })
}
