import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getBusinessForRequest } from '@/lib/business-account'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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

  const { feedbackId, reviewId, businessId } = req.body as {
    feedbackId?: string | null
    reviewId?: string | null
    businessId?: string
  }

  if (!feedbackId && !reviewId) {
    return res.status(400).json({ error: 'feedbackId or reviewId required' })
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (feedbackId && !UUID_RE.test(feedbackId)) {
    return res.status(400).json({ error: 'Invalid feedbackId' })
  }
  if (reviewId && !UUID_RE.test(reviewId)) {
    return res.status(400).json({ error: 'Invalid reviewId' })
  }

  const { row: business, error: bizError } = await getBusinessForRequest(
    supabaseAdmin,
    user.id,
    businessId ?? null,
    'id'
  )
  if (bizError || !business) {
    return res.status(404).json({ error: 'Business not found' })
  }

  const resolvedBusinessId = business.id as string

  if (feedbackId) {
    const { error } = await supabaseAdmin
      .from('feedback')
      .update({ is_resolved: true })
      .eq('id', feedbackId)
      .eq('business_id', resolvedBusinessId)

    if (error) {
      return res.status(500).json({ error: 'Failed to resolve feedback' })
    }
    return res.status(200).json({ success: true })
  }

  // Follow-up-only: mark review resolved via owner_resolved_at
  const { error } = await supabaseAdmin
    .from('reviews')
    .update({ owner_resolved_at: new Date().toISOString() })
    .eq('id', reviewId!)
    .eq('business_id', resolvedBusinessId)

  if (error) {
    return res.status(500).json({ error: 'Failed to resolve follow-up' })
  }
  return res.status(200).json({ success: true })
}
