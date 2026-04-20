import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { generateReviewResponse } from '../../../lib/claude'
import { canUseAIFeatures } from '../../../lib/tier-permissions'
import { getAuthContext, parseTier, apiError, apiSuccess, supabaseAdmin } from '../../../lib/api-utils'

const schema = z.object({
  reviewText: z.string().min(1, 'Review text is required'),
  reviewRating: z.number().int().min(1).max(5, 'Review rating must be 1-5'),
  tone: z.enum(['friendly', 'professional', 'casual']),
  maxWords: z.number().int().positive().optional(),
  specificIssues: z.string().max(200).optional(),
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return apiError(res, 405, 'Method not allowed')
  }

  const ctx = await getAuthContext(req, res)
  if (!ctx) return

  const { business } = ctx
  const tier = parseTier(business.tier)

  if (!canUseAIFeatures(tier)) {
    return apiError(res, 403, 'AI tier required', { upgrade: true })
  }

  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    return apiError(res, 400, parsed.error.issues[0]?.message ?? 'Invalid request')
  }

  const { reviewText, reviewRating, tone, maxWords, specificIssues } = parsed.data

  const result = await generateReviewResponse({
    reviewText,
    reviewRating,
    businessName: String(business.business_name),
    businessType: String(business.business_type || 'business'),
    tone,
    maxWords,
    specificIssues,
    quota: { businessId: String(business.id), supabase: supabaseAdmin, tier },
  })

  if (result.quotaExceeded) {
    return apiError(res, 429, 'Monthly AI token limit reached', { upgrade: true })
  }

  if (!result.success || !result.content) {
    console.error('[generate-response] Generation failed:', result.error)
    return apiError(res, 500, 'Failed to generate response')
  }

  const { data: response, error: responseError } = await supabaseAdmin
    .from('ai_review_responses')
    .insert({
      business_id: business.id,
      review_text: reviewText,
      review_rating: reviewRating,
      generated_response: result.content,
      prompt_params: { tone, maxWords, specificIssues },
      tokens_used: result.tokensUsed ?? 0,
      was_used: false,
    })
    .select('id, generated_response, created_at')
    .single()

  if (responseError) {
    console.error('[generate-response] Response save error:', responseError)
    // Don't fail — still return the generated content
  }

  return apiSuccess(res, {
    success: true,
    response: result.content,
    responseId: response?.id ?? null,
    tokensUsed: result.tokensUsed ?? 0,
  })
}
