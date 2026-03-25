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

    // Calculate tier demand stats
    const interestedInPro = businessesWithStats.filter(
      (b) => b.interested_in_tier === 'pro' && b.notify_on_launch === true
    ).length

    const interestedInAI = businessesWithStats.filter(
      (b) => b.interested_in_tier === 'ai' && b.notify_on_launch === true
    ).length

    // Calculate tier distribution
    const freeCount = businessesWithStats.filter((b) => b.tier === 'free').length
    const proCount = businessesWithStats.filter((b) => b.tier === 'pro').length
    const aiCount = businessesWithStats.filter((b) => b.tier === 'ai').length

    // Calculate signups over last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const signupsByDay: { [key: string]: number } = {}

    // Initialize all days with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      signupsByDay[dateStr] = 0
    }

    // Count signups by day
    businessesWithStats.forEach((b) => {
      const createdDate = new Date(b.created_at)
      if (createdDate >= thirtyDaysAgo) {
        const dateStr = createdDate.toISOString().split('T')[0]
        if (signupsByDay[dateStr] !== undefined) {
          signupsByDay[dateStr]++
        }
      }
    })

    // Convert to array and sort by date
    const signupsOverTime = Object.entries(signupsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return res.status(200).json({
      businesses: businessesWithStats,
      stats: {
        total: totalBusinesses,
        recentSignups,
        interestedInPro,
        interestedInAI,
      },
      charts: {
        tierDistribution: [
          { name: 'Free', value: freeCount },
          { name: 'Pro', value: proCount },
          { name: 'AI', value: aiCount },
        ],
        signupsOverTime,
      },
    })
  } catch (error) {
    console.error('Error in get-businesses API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
