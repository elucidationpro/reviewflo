/**
 * POST /api/revenue/add-sale
 * Add a revenue attribution entry.
 * Body: { customerName?, saleAmount, attributionSource, saleDate?, notes? }
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VALID_SOURCES = ['google_reviews', 'facebook', 'referral', 'repeat_customer', 'other']

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    const { customerName, saleAmount, attributionSource, saleDate, notes } = req.body as {
      customerName?: string
      saleAmount?: number | string
      attributionSource?: string
      saleDate?: string
      notes?: string
    }

    // Validate required fields
    if (!saleAmount) {
      return res.status(400).json({ error: 'saleAmount is required' })
    }

    const amount = parseFloat(String(saleAmount))
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'saleAmount must be a positive number' })
    }

    if (!attributionSource || !VALID_SOURCES.includes(attributionSource)) {
      return res.status(400).json({
        error: `attributionSource must be one of: ${VALID_SOURCES.join(', ')}`,
      })
    }

    // Validate date if provided
    const finalDate = saleDate
      ? new Date(saleDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    if (isNaN(new Date(finalDate).getTime())) {
      return res.status(400).json({ error: 'Invalid saleDate' })
    }

    // Insert sale
    const { data: newSale, error: insertError } = await supabaseAdmin
      .from('revenue_attribution')
      .insert({
        business_id: business.id,
        customer_name: customerName?.trim() || null,
        sale_amount: amount,
        sale_date: finalDate,
        attribution_source: attributionSource,
        notes: notes?.trim() || null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[add-sale] Insert error:', insertError)
      return res.status(500).json({ error: 'Failed to save sale' })
    }

    // Recalculate monthly summary for the month of this sale
    const monthStart = new Date(finalDate)
    monthStart.setDate(1)
    const monthStr = monthStart.toISOString().split('T')[0]

    const { error: calcError } = await supabaseAdmin.rpc('recalculate_monthly_summary', {
      p_business_id: business.id,
      p_month: monthStr,
    })

    if (calcError) {
      // Non-fatal: sale was saved, summary might be stale
      console.error('[add-sale] Monthly summary recalculation failed:', calcError)
    }

    return res.status(201).json({
      success: true,
      id: newSale.id,
      message: 'Sale recorded successfully',
    })
  } catch (err) {
    console.error('[add-sale] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
