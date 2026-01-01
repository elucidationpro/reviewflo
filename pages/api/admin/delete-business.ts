import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '../../../lib/adminAuth'

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
  if (req.method !== 'DELETE') {
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

    if (authError || !user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const { businessId } = req.body

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' })
    }

    // Fetch the business to get user_id for auth deletion
    const { data: business, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('user_id, business_name')
      .eq('id', businessId)
      .single()

    if (fetchError || !business) {
      console.error('Error fetching business:', fetchError)
      return res.status(404).json({ error: 'Business not found' })
    }

    // Delete related data first (foreign key constraints)
    // Delete review templates
    const { error: templatesError } = await supabaseAdmin
      .from('review_templates')
      .delete()
      .eq('business_id', businessId)

    if (templatesError) {
      console.error('Error deleting review templates:', templatesError)
      // Continue anyway, might not have any templates
    }

    // Delete reviews
    const { error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .delete()
      .eq('business_id', businessId)

    if (reviewsError) {
      console.error('Error deleting reviews:', reviewsError)
      // Continue anyway
    }

    // Delete feedback
    const { error: feedbackError } = await supabaseAdmin
      .from('feedback')
      .delete()
      .eq('business_id', businessId)

    if (feedbackError) {
      console.error('Error deleting feedback:', feedbackError)
      // Continue anyway
    }

    // Delete the business record
    const { error: businessError } = await supabaseAdmin
      .from('businesses')
      .delete()
      .eq('id', businessId)

    if (businessError) {
      console.error('Error deleting business:', businessError)
      return res.status(500).json({ error: 'Failed to delete business' })
    }

    // Delete the associated auth user
    const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(business.user_id)

    if (userError) {
      console.error('Error deleting auth user:', userError)
      // Don't fail the request if user deletion fails, business is already deleted
    }

    console.log('[delete-business] Successfully deleted business:', businessId, business.business_name)
    return res.status(200).json({ success: true, message: 'Business deleted successfully' })
  } catch (error) {
    console.error('Error in delete-business API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
