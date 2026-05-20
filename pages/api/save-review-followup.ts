import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sanitizeReviewFollowupAnswerInput } from '@/lib/review-page-followup'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const MAX_REVIEW_AGE_MS = 24 * 60 * 60 * 1000

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { reviewId, businessId, answer } = req.body as {
      reviewId?: string
      businessId?: string
      answer?: string | null
    }

    if (!reviewId || !businessId) {
      return res.status(400).json({ error: 'reviewId and businessId are required' })
    }

    const { value, error: answerError } = sanitizeReviewFollowupAnswerInput(answer)
    if (answerError) {
      return res.status(400).json({ error: answerError })
    }

    const { data: review, error: fetchError } = await supabaseAdmin
      .from('reviews')
      .select('id, business_id, created_at')
      .eq('id', reviewId)
      .eq('business_id', businessId)
      .single()

    if (fetchError || !review) {
      return res.status(404).json({ error: 'Review not found' })
    }

    const createdAt = new Date(review.created_at as string).getTime()
    if (Number.isNaN(createdAt) || Date.now() - createdAt > MAX_REVIEW_AGE_MS) {
      return res.status(400).json({ error: 'This review can no longer be updated' })
    }

    const { error: updateError } = await supabaseAdmin
      .from('reviews')
      .update({ followup_answer: value })
      .eq('id', reviewId)
      .eq('business_id', businessId)

    if (updateError) {
      console.error('save-review-followup update error:', updateError)
      return res.status(500).json({ error: 'Failed to save answer' })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('save-review-followup:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
