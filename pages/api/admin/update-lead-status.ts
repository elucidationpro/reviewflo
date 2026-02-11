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

    const { leadId, status, businessId } = req.body

    if (!leadId || !status) {
      return res.status(400).json({ error: 'leadId and status are required' })
    }

    // Validate status
    const validStatuses = ['waitlist', 'beta_invited', 'beta_active', 'converted', 'declined']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    // Prepare update object
    const updateData: { status: string; business_id?: string } = { status }

    // If converting to 'converted' status and businessId is provided, link the business
    if (status === 'converted' && businessId) {
      updateData.business_id = businessId
    }

    // Update the lead status
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update(updateData)
      .eq('id', leadId)

    if (updateError) {
      console.error('Error updating lead status:', updateError)
      return res.status(500).json({ error: 'Failed to update lead status' })
    }

    console.log('[update-lead-status] Successfully updated lead:', leadId, 'to status:', status)
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in update-lead-status API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
