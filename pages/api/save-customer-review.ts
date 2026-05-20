import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

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

/** Inserts public star rating via service role so we can RETURN id (anon RLS has no SELECT on reviews). */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { businessId, starRating } = req.body as {
      businessId?: string
      starRating?: unknown
    }

    if (!businessId || typeof businessId !== 'string') {
      return res.status(400).json({ error: 'businessId is required' })
    }

    const rating =
      typeof starRating === 'number' ? starRating : typeof starRating === 'string' ? Number(starRating) : NaN
    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || Math.floor(rating) !== rating) {
      return res.status(400).json({ error: 'starRating must be an integer from 1 to 5' })
    }

    const { data: biz, error: bizErr } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .maybeSingle()

    if (bizErr || !biz) {
      return res.status(404).json({ error: 'Business not found' })
    }

    const createdAt = new Date().toISOString()
    const { data: row, error: insertErr } = await supabaseAdmin
      .from('reviews')
      .insert({
        business_id: businessId,
        star_rating: rating,
        created_at: createdAt,
      })
      .select('id')
      .single()

    if (insertErr || !row?.id) {
      console.error('save-customer-review insert:', insertErr)
      return res.status(500).json({ error: 'Failed to save review' })
    }

    return res.status(200).json({ reviewId: row.id })
  } catch (err) {
    console.error('save-customer-review:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
