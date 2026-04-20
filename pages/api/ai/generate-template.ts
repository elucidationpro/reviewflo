import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { generateReviewRequestTemplate } from '../../../lib/claude'
import { canUseAIFeatures } from '../../../lib/tier-permissions'
import { getAuthContext, parseTier, apiError, apiSuccess, supabaseAdmin } from '../../../lib/api-utils'

const schema = z.object({
  tone: z.enum(['friendly', 'professional', 'casual']),
  channel: z.enum(['sms', 'email']),
  maxWords: z.number().int().positive().optional(),
  includeEmoji: z.boolean().optional(),
  customContext: z.string().max(300).optional(),
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

  const { tone, channel, maxWords, includeEmoji, customContext } = parsed.data

  const result = await generateReviewRequestTemplate({
    businessType: String(business.business_type || 'business'),
    tone,
    channel,
    maxWords,
    includeEmoji,
    customContext,
    quota: { businessId: String(business.id), supabase: supabaseAdmin, tier },
  })

  if (result.quotaExceeded) {
    return apiError(res, 429, 'Monthly AI token limit reached', { upgrade: true })
  }

  if (!result.success || !result.content) {
    console.error('[generate-template] Generation failed:', result.error)
    return apiError(res, 500, 'Failed to generate template')
  }

  const { data: draft, error: draftError } = await supabaseAdmin
    .from('ai_review_drafts')
    .insert({
      business_id: business.id,
      draft_type: 'request_template',
      generated_text: result.content,
      prompt_params: { tone, channel, maxWords, includeEmoji, customContext },
      tokens_used: result.tokensUsed ?? 0,
    })
    .select('id, generated_text, created_at')
    .single()

  if (draftError) {
    console.error('[generate-template] Draft save error:', draftError)
    // Don't fail — still return the generated content
  }

  return apiSuccess(res, {
    success: true,
    template: result.content,
    draftId: draft?.id ?? null,
    tokensUsed: result.tokensUsed ?? 0,
  })
}
