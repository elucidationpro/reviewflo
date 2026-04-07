/**
 * GET /api/revenue/summary
 * Returns monthly attribution summary + recent entries.
 * Query params:
 *   - month: YYYY-MM-DD (first of month, defaults to current month)
 */
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
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

    // Determine target month
    let monthDate: Date
    if (req.query.month && typeof req.query.month === 'string') {
      monthDate = new Date(req.query.month)
      if (isNaN(monthDate.getTime())) {
        return res.status(400).json({ error: 'Invalid month parameter' })
      }
    } else {
      monthDate = new Date()
    }
    monthDate.setDate(1)
    monthDate.setHours(0, 0, 0, 0)
    const monthStr = monthDate.toISOString().split('T')[0]
    const monthEnd = new Date(monthDate)
    monthEnd.setMonth(monthEnd.getMonth() + 1)
    monthEnd.setDate(0)
    const monthEndStr = monthEnd.toISOString().split('T')[0]

    // Get monthly summary
    const { data: summary } = await supabaseAdmin
      .from('monthly_attribution_summary')
      .select('*')
      .eq('business_id', business.id)
      .eq('month', monthStr)
      .single()

    // Get individual entries for this month
    const { data: entries } = await supabaseAdmin
      .from('revenue_attribution')
      .select('id, customer_name, sale_amount, sale_date, attribution_source, notes, created_at')
      .eq('business_id', business.id)
      .gte('sale_date', monthStr)
      .lte('sale_date', monthEndStr)
      .order('sale_date', { ascending: false })

    // Build source breakdown from entries
    const sourceBreakdown: Record<string, { count: number; revenue: number; percentage: number }> = {}
    const allEntries = entries || []
    const totalRevenue = allEntries.reduce((sum, e) => sum + parseFloat(e.sale_amount), 0)

    allEntries.forEach((e) => {
      if (!sourceBreakdown[e.attribution_source]) {
        sourceBreakdown[e.attribution_source] = { count: 0, revenue: 0, percentage: 0 }
      }
      sourceBreakdown[e.attribution_source].count++
      sourceBreakdown[e.attribution_source].revenue += parseFloat(e.sale_amount)
    })

    // Calculate percentages
    Object.keys(sourceBreakdown).forEach((key) => {
      sourceBreakdown[key].percentage = totalRevenue > 0
        ? Math.round((sourceBreakdown[key].revenue / totalRevenue) * 100)
        : 0
    })

    return res.status(200).json({
      month: monthStr,
      summary: summary || {
        google_review_customers: 0,
        google_review_revenue: 0,
        total_customers: 0,
        total_revenue: 0,
        attribution_percentage: 0,
      },
      entries: allEntries,
      sourceBreakdown,
      totalRevenue,
    })
  } catch (err) {
    console.error('[revenue/summary] Error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
