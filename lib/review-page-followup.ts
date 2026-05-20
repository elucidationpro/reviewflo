/**
 * Pro/AI: optional follow-up question after star rating on /{slug}.
 */

import { canCustomizeReviewPageCopy, type Tier } from '@/lib/tier-permissions'

export const MAX_REVIEW_PAGE_FOLLOWUP_QUESTION = 200
export const MAX_REVIEW_PAGE_FOLLOWUP_PLACEHOLDER = 200
export const MAX_REVIEW_FOLLOWUP_ANSWER = 500

export type ReviewPageFollowupBusiness = {
  tier?: Tier
  review_page_followup_enabled?: boolean | null
  review_page_followup_question?: string | null
  review_page_followup_placeholder?: string | null
}

export type ResolvedReviewPageFollowup = {
  question: string
  placeholder: string | null
}

/** Optional tier override (e.g. child location row inherits account Pro/AI from primary). */
export type ReviewPageFollowupOptions = {
  accountTier?: Tier
}

export type SanitizedReviewPageFollowupSettings = {
  enabled: boolean
  question: string | null
  placeholder: string | null
}

function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** True when the customer should see the follow-up step after rating. */
export function shouldShowReviewPageFollowup(
  business: ReviewPageFollowupBusiness,
  options?: ReviewPageFollowupOptions
): boolean {
  const tier = options?.accountTier ?? business.tier
  if (!canCustomizeReviewPageCopy(tier)) return false
  if (!business.review_page_followup_enabled) return false
  return normalizeText(business.review_page_followup_question) != null
}

/** Question + placeholder for the customer follow-up screen. */
export function resolveReviewPageFollowup(
  business: ReviewPageFollowupBusiness,
  options?: ReviewPageFollowupOptions
): ResolvedReviewPageFollowup | null {
  const question = normalizeText(business.review_page_followup_question)
  if (!shouldShowReviewPageFollowup(business, options) || !question) return null
  return {
    question,
    placeholder: normalizeText(business.review_page_followup_placeholder),
  }
}

export function sanitizeReviewPageFollowupSettingsInput(input: {
  enabled?: boolean
  question?: string | null
  placeholder?: string | null
}): { values: SanitizedReviewPageFollowupSettings; error: string | null } {
  const enabled = input.enabled === true
  const question = normalizeText(input.question)
  const placeholder = normalizeText(input.placeholder)

  if (input.question != null && typeof input.question !== 'string') {
    return { values: { enabled, question, placeholder }, error: 'Question must be text' }
  }
  if (input.placeholder != null && typeof input.placeholder !== 'string') {
    return { values: { enabled, question, placeholder }, error: 'Placeholder must be text' }
  }
  if (question && question.length > MAX_REVIEW_PAGE_FOLLOWUP_QUESTION) {
    return {
      values: { enabled, question, placeholder },
      error: `Question must be at most ${MAX_REVIEW_PAGE_FOLLOWUP_QUESTION} characters`,
    }
  }
  if (placeholder && placeholder.length > MAX_REVIEW_PAGE_FOLLOWUP_PLACEHOLDER) {
    return {
      values: { enabled, question, placeholder },
      error: `Placeholder must be at most ${MAX_REVIEW_PAGE_FOLLOWUP_PLACEHOLDER} characters`,
    }
  }
  if (enabled && !question) {
    return {
      values: { enabled, question, placeholder },
      error: 'Add a question before enabling the follow-up step',
    }
  }

  return {
    values: {
      enabled: enabled && !!question,
      question,
      placeholder,
    },
    error: null,
  }
}

export function sanitizeReviewFollowupAnswerInput(
  answer: string | null | undefined
): { value: string | null; error: string | null } {
  if (answer == null) return { value: null, error: null }
  if (typeof answer !== 'string') {
    return { value: null, error: 'Answer must be text' }
  }
  const trimmed = answer.trim()
  if (trimmed.length === 0) return { value: null, error: null }
  if (trimmed.length > MAX_REVIEW_FOLLOWUP_ANSWER) {
    return {
      value: null,
      error: `Answer must be at most ${MAX_REVIEW_FOLLOWUP_ANSWER} characters`,
    }
  }
  return { value: trimmed, error: null }
}
