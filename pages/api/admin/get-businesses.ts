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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user || !isAdminUser(user)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    // Fetch all businesses with stats
    const { data: businesses, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })

    if (businessError) {
      console.error('Error fetching businesses:', businessError)
      return res.status(500).json({ error: 'Failed to fetch businesses' })
    }

    // For each business, get review and feedback counts
    const businessesWithStats = await Promise.all(
      businesses.map(async (business) => {
        // Get reviews count
        const { count: reviewsCount } = await supabaseAdmin
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)

        // Get feedback count
        const { count: feedbackCount } = await supabaseAdmin
          .from('feedback')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)

        return {
          ...business,
          reviews_count: reviewsCount || 0,
          feedback_count: feedbackCount || 0,
        }
      })
    )

    // Calculate summary stats
    const totalBusinesses = businessesWithStats.length
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentSignups = businessesWithStats.filter(
      (b) => new Date(b.created_at) >= sevenDaysAgo
    ).length

    return res.status(200).json({
      businesses: businessesWithStats,
      stats: {
        total: totalBusinesses,
        recentSignups,
      },
    })
  } catch (error) {
    console.error('Error in get-businesses API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
