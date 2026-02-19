import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminUser } from '../../../lib/adminAuth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user || !isAdminUser(user)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const { businessId } = req.body as { businessId: string }
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' })
    }

    const [{ error: reviewsError }, { error: feedbackError }] = await Promise.all([
      supabaseAdmin.from('reviews').delete().eq('business_id', businessId),
      supabaseAdmin.from('feedback').delete().eq('business_id', businessId)
    ])

    if (reviewsError) {
      console.error('Error clearing reviews:', reviewsError)
      return res.status(500).json({ error: reviewsError.message || 'Failed to clear reviews' })
    }
    if (feedbackError) {
      console.error('Error clearing feedback:', feedbackError)
      return res.status(500).json({ error: feedbackError.message || 'Failed to clear feedback' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in clear-business-reviews-feedback API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
