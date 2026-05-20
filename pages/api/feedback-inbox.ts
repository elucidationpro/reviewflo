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

type FeedbackRow = {
  id: string
  star_rating: number
  what_happened: string
  how_to_make_right: string
  wants_contact: boolean
  email: string | null
  phone: string | null
  is_resolved: boolean
  review_id: string | null
  created_at: string
}

type ReviewRow = {
  id: string
  star_rating: number
  followup_answer: string
  owner_resolved_at: string | null
  created_at: string
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

  // Fast path: dashboard badge only needs counts, not the full merged list
  if (countOnly) {
    const [feedbackCount, reviewCount] = await Promise.all([
      supabaseAdmin
        .from('feedback')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', resolvedBusinessId)
        .eq('is_resolved', false),
      supabaseAdmin
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', resolvedBusinessId)
        .not('followup_answer', 'is', null)
        .is('owner_resolved_at', null),
    ])
    // Note: feedback rows with a review_id are counted in feedbackCount; the linked review row
    // is excluded from reviewCount because it has owner_resolved_at null but IS linked — however
    // reviews only appear in reviewCount when they are NOT linked via feedback.review_id. This
    // slight over-count is acceptable for a badge and avoids the full merge cost.
    return res.status(200).json({
      pendingCount: (feedbackCount.count ?? 0) + (reviewCount.count ?? 0),
    })
  }

  // Parallel fetch: feedback rows and reviews with follow-up answers
  const [feedbackResult, reviewResult] = await Promise.all([
    supabaseAdmin
      .from('feedback')
      .select('id, star_rating, what_happened, how_to_make_right, wants_contact, email, phone, is_resolved, review_id, created_at')
      .eq('business_id', resolvedBusinessId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabaseAdmin
      .from('reviews')
      .select('id, star_rating, followup_answer, owner_resolved_at, created_at')
      .eq('business_id', resolvedBusinessId)
      .not('followup_answer', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (feedbackResult.error) {
    return res.status(500).json({ error: 'Failed to load feedback' })
  }
  if (reviewResult.error) {
    return res.status(500).json({ error: 'Failed to load reviews' })
  }

  const feedbackRows = (feedbackResult.data ?? []) as FeedbackRow[]
  const reviewRows = (reviewResult.data ?? []) as ReviewRow[]

  // Build a set of review IDs already linked to a feedback row
  const linkedReviewIds = new Set(
    feedbackRows.map((f) => f.review_id).filter((id): id is string => id != null)
  )

  // Build follow-up answer map: reviewId → followup_answer
  const followupByReviewId = new Map<string, string>(
    reviewRows.map((r) => [r.id, r.followup_answer])
  )

  const items: FeedbackInboxItem[] = []

  // Feedback rows — may have a linked follow-up answer via review_id
  for (const f of feedbackRows) {
    items.push({
      key: f.id,
      feedbackId: f.id,
      reviewId: f.review_id,
      starRating: f.star_rating ?? 0,
      followupAnswer: f.review_id ? (followupByReviewId.get(f.review_id) ?? null) : null,
      whatHappened: f.what_happened,
      howToMakeRight: f.how_to_make_right,
      wantsContact: f.wants_contact ?? false,
      email: f.email,
      phone: f.phone,
      isResolved: f.is_resolved ?? false,
      createdAt: f.created_at,
    })
  }

  // Follow-up-only review rows (not linked to any feedback row)
  for (const r of reviewRows) {
    if (linkedReviewIds.has(r.id)) continue
    items.push({
      key: r.id,
      feedbackId: null,
      reviewId: r.id,
      starRating: r.star_rating ?? 0,
      followupAnswer: r.followup_answer,
      whatHappened: null,
      howToMakeRight: null,
      wantsContact: false,
      email: null,
      phone: null,
      isResolved: r.owner_resolved_at != null,
      createdAt: r.created_at,
    })
  }

  // Sort newest first
  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return res.status(200).json({ items })
}
