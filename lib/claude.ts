import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getMonthlyTokenLimit } from './tier-permissions'
import type { Tier } from './tier-permissions'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-haiku-4-5-20251001'
const SONNET_MODEL = 'claude-sonnet-4-6'

export interface GenerateReviewRequestTemplateParams {
  businessType: string
  tone: 'friendly' | 'professional' | 'casual'
  channel: 'sms' | 'email'
  maxWords?: number
  includeEmoji?: boolean
  customContext?: string
  quota?: QuotaContext
}

export interface GenerateReviewResponseParams {
  reviewText: string
  reviewRating: number
  businessName: string
  businessType: string
  tone: 'friendly' | 'professional' | 'casual'
  maxWords?: number
  specificIssues?: string
  quota?: QuotaContext
}

export interface AIGenerationResult {
  success: boolean
  content?: string
  error?: unknown
  tokensUsed?: number
  quotaExceeded?: boolean
}

interface QuotaContext {
  businessId: string
  supabase: SupabaseClient
  tier: Tier
}

export async function getRemainingMonthlyTokens(
  businessId: string,
  supabase: SupabaseClient,
  tier: Tier
): Promise<number> {
  const limit = getMonthlyTokenLimit(tier)
  if (limit === 0) return 0

  const startOfMonth = new Date()
  startOfMonth.setUTCDate(1)
  startOfMonth.setUTCHours(0, 0, 0, 0)
  const isoStart = startOfMonth.toISOString()

  const [responsesResult, draftsResult] = await Promise.all([
    supabase
      .from('ai_review_responses')
      .select('tokens_used')
      .eq('business_id', businessId)
      .gte('created_at', isoStart),
    supabase
      .from('ai_review_drafts')
      .select('tokens_used')
      .eq('business_id', businessId)
      .gte('created_at', isoStart),
  ])

  const sum = (rows: Array<{ tokens_used: number }> | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.tokens_used ?? 0), 0)

  const used = sum(responsesResult.data) + sum(draftsResult.data)
  return limit - used
}

export async function generateReviewRequestTemplate(
  params: GenerateReviewRequestTemplateParams
): Promise<AIGenerationResult> {
  const {
    businessType,
    tone,
    channel,
    maxWords = channel === 'sms' ? 50 : 100,
    includeEmoji = tone === 'friendly',
    customContext,
    quota,
  } = params

  if (quota) {
    const remaining = await getRemainingMonthlyTokens(quota.businessId, quota.supabase, quota.tier)
    if (remaining <= 0) return { success: false, quotaExceeded: true }
  }

  try {
    const prompt = `You are helping a ${businessType} owner write a review request message for their customers.

Requirements:
- Channel: ${channel.toUpperCase()}
- Tone: ${tone}
- Max words: ${maxWords}
- ${includeEmoji ? 'Include 1-2 relevant emojis' : 'No emojis'}
${customContext ? `- Additional context: ${customContext}` : ''}

Guidelines:
- Be warm and genuine
- Keep it brief and scannable
- Include placeholders: [Name], [Business], [link]
- Make it easy to say yes
- Don't be pushy or salesy
${channel === 'sms' ? '- SMS-friendly: short, direct, personal' : '- Email-friendly: can be slightly longer, use paragraphs'}

Write ONLY the message template. No explanations or meta-commentary.`

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return { success: false, error: 'Unexpected response type' }
    }

    return {
      success: true,
      content: content.text.trim(),
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    }
  } catch (error) {
    console.error('[generateReviewRequestTemplate] Error:', error)
    return { success: false, error }
  }
}

export async function generateReviewResponse(
  params: GenerateReviewResponseParams
): Promise<AIGenerationResult> {
  const {
    reviewText,
    reviewRating,
    businessName,
    businessType,
    tone,
    maxWords = 100,
    specificIssues,
    quota,
  } = params

  if (quota) {
    const remaining = await getRemainingMonthlyTokens(quota.businessId, quota.supabase, quota.tier)
    if (remaining <= 0) return { success: false, quotaExceeded: true }
  }

  try {
    const ratingContext =
      reviewRating === 5
        ? '5-star review (very positive)'
        : reviewRating === 4
        ? '4-star review (positive with room for improvement)'
        : reviewRating === 3
        ? '3-star review (mixed feedback)'
        : '1-2 star review (negative - damage control mode)'

    const prompt = `You are helping ${businessName}, a ${businessType}, respond to a Google review.

Review: "${reviewText}"
Rating: ${ratingContext}
Response tone: ${tone}
Max words: ${maxWords}
${specificIssues ? `Specific issues to address: ${specificIssues}` : ''}

Guidelines:
- Thank the reviewer by name if mentioned, otherwise use "Thank you"
- ${reviewRating >= 4 ? 'Express gratitude and enthusiasm' : 'Acknowledge concerns professionally'}
- ${reviewRating <= 3 ? 'Apologize sincerely and offer to make it right' : 'Reinforce positive points'}
- ${reviewRating <= 3 ? 'Provide contact info for direct resolution' : 'Invite them back'}
- Sound human, not corporate
- Keep it concise and genuine
- Don't be defensive or make excuses
- Sign off with just the business name (no "- Team" or signatures)

Write ONLY the review response. No explanations or meta-commentary.`

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return { success: false, error: 'Unexpected response type' }
    }

    return {
      success: true,
      content: content.text.trim(),
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
    }
  } catch (error) {
    console.error('[generateReviewResponse] Error:', error)
    return { success: false, error }
  }
}

export interface GenerateReviewReplyDraftParams {
  businessName: string
  reviewText: string
  reviewRating: number
  reviewerName: string
  quota?: QuotaContext
}

/**
 * Draft a reply to a Google review using Sonnet for higher quality customer-facing output.
 * Tracks usage in ai_review_drafts for monthly quota enforcement.
 */
export async function generateReviewReplyDraft(
  params: GenerateReviewReplyDraftParams
): Promise<AIGenerationResult> {
  const { businessName, reviewText, reviewRating, reviewerName, quota } = params

  if (quota) {
    const remaining = await getRemainingMonthlyTokens(quota.businessId, quota.supabase, quota.tier)
    if (remaining <= 0) return { success: false, quotaExceeded: true }
  }

  try {
    const systemPrompt = `You are drafting a reply on behalf of ${businessName} to a Google review they received. Keep it warm, brief (2-4 sentences), and professional. Acknowledge specifics from the review when possible (mention the customer's name if natural). For 5-star reviews, thank them sincerely without being effusive. For 4-star, thank them and gently invite them back. For 1-3 star, acknowledge their concern, do not be defensive, and offer to make it right offline (suggest they reach out directly). Never include hashtags, emojis, or marketing language. Write as if the business owner is replying personally.`

    const userMessage = `Reviewer: ${reviewerName}
Rating: ${reviewRating} out of 5 stars
Review: ${reviewText || '(No written review — rating only)'}

Please draft a reply.`

    const message = await anthropic.messages.create({
      model: SONNET_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const content = message.content[0]
    if (content.type !== 'text') {
      return { success: false, error: 'Unexpected response type' }
    }

    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens

    if (quota) {
      await quota.supabase.from('ai_review_drafts').insert({
        business_id: quota.businessId,
        tokens_used: tokensUsed,
        created_at: new Date().toISOString(),
      })
    }

    return { success: true, content: content.text.trim(), tokensUsed }
  } catch (error) {
    console.error('[generateReviewReplyDraft] Error:', error)
    return { success: false, error }
  }
}

export async function testClaudeConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { success: false, error: 'ANTHROPIC_API_KEY not configured' }
    }

    await anthropic.messages.create({
      model: MODEL,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    })

    return { success: true }
  } catch (error) {
    console.error('[testClaudeConnection] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
