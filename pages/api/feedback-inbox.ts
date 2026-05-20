import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getBusinessForRequest } from '@/lib/business-account'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export type FeedbackInboxItem = {
  key: string
  feedbackId: string | null
  reviewId: string | null
  starRating: number
  followupAnswer: string | null
  whatHappened: string | null
  howToMakeRight: string | null
  wantsContact: boolean
  email: string | null
  phone: string | null
  isResolved: boolean
  createdAt: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = authHeader.slice(7)

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const businessId = typeof req.query.businessId === 'string' ? req.query.businessId : null
  const countOnly = req.query.countOnly === 'true'

  const { row: business, error: bizError } = await getBusinessForRequest(
    supabaseAdmin,
    user.id,
    businessId,
    'id'
  )
  if (bizError || !business) {
    return res.status(404).json({ error: 'Business not found' })
  }

  const resolvedBusinessId = business.id as string

  // Fetch feedback rows (private form submissions)
  const { data: feedbackRows, error: feedbackError } = await supabaseAdmin
    .from('feedback')
    .select('id, star_rating, what_happened, how_to_make_right, wants_contact, email, phone, is_resolved, review_id, created_at')
    .eq('business_id', resolvedBusinessId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (feedbackError) {
    return res.status(500).json({ error: 'Failed to load feedback' })
  }

  // Fetch reviews with follow-up answers
  const { data: reviewRows, error: reviewError } = await supabaseAdmin
    .from('reviews')
    .select('id, star_rating, followup_answer, owner_resolved_at, created_at')
    .eq('business_id', resolvedBusinessId)
    .not('followup_answer', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (reviewError) {
    return res.status(500).json({ error: 'Failed to load reviews' })
  }

  // Build a set of review IDs already linked to a feedback row
  const linkedReviewIds = new Set(
    (feedbackRows || [])
      .map((f: Record<string, unknown>) => f.review_id as string | null)
      .filter(Boolean)
  )

  // Build follow-up answer map: reviewId → followup_answer
  const followupByReviewId = new Map<string, string>(
    (reviewRows || []).map((r: Record<string, unknown>) => [
      r.id as string,
      r.followup_answer as string,
    ])
  )

  const items: FeedbackInboxItem[] = []

  // Feedback rows (may have linked follow-up answer via review_id)
  for (const f of feedbackRows || []) {
    const fr = f as Record<string, unknown>
    const linkedReviewId = fr.review_id as string | null
    items.push({
      key: fr.id as string,
      feedbackId: fr.id as string,
      reviewId: linkedReviewId,
      starRating: (fr.star_rating as number) ?? 0,
      followupAnswer: linkedReviewId ? (followupByReviewId.get(linkedReviewId) ?? null) : null,
      whatHappened: fr.what_happened as string,
      howToMakeRight: fr.how_to_make_right as string,
      wantsContact: (fr.wants_contact as boolean) ?? false,
      email: (fr.email as string) ?? null,
      phone: (fr.phone as string) ?? null,
      isResolved: (fr.is_resolved as boolean) ?? false,
      createdAt: fr.created_at as string,
    })
  }

  // Follow-up-only review rows (reviews with followup_answer not linked to any feedback row)
  for (const r of reviewRows || []) {
    const rv = r as Record<string, unknown>
    if (linkedReviewIds.has(rv.id as string)) continue
    items.push({
      key: rv.id as string,
      feedbackId: null,
      reviewId: rv.id as string,
      starRating: (rv.star_rating as number) ?? 0,
      followupAnswer: rv.followup_answer as string,
      whatHappened: null,
      howToMakeRight: null,
      wantsContact: false,
      email: null,
      phone: null,
      isResolved: (rv.owner_resolved_at as string | null) != null,
      createdAt: rv.created_at as string,
    })
  }

  // Sort all items newest first
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  if (countOnly) {
    return res.status(200).json({ pendingCount: items.filter((i) => !i.isResolved).length })
  }

  return res.status(200).json({ items })
}
