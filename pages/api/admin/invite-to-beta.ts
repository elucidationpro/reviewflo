import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { isAdminEmail } from '../../../lib/adminAuth'
import { sendBetaInvitationEmail } from '../../../lib/email-service'

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

    if (authError || !user || !isAdminEmail(user.email)) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' })
    }

    const { leadId } = req.body

    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' })
    }

    // Fetch the lead to get their details
    const { data: lead, error: fetchError } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (fetchError || !lead) {
      console.error('Error fetching lead:', fetchError)
      return res.status(404).json({ error: 'Lead not found' })
    }

    // Check if lead is in waitlist status
    if (lead.status !== 'waitlist') {
      return res.status(400).json({
        error: `Cannot invite lead with status "${lead.status}". Only waitlist leads can be invited to beta.`
      })
    }

    // Update the lead status to beta_invited
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({
        status: 'beta_invited',
        updated_at: new Date().toISOString()
      })
      .eq('id', leadId)

    if (updateError) {
      console.error('Error updating lead status:', updateError)
      return res.status(500).json({ error: 'Failed to update lead status' })
    }

    // Send beta invitation email
    const emailResult = await sendBetaInvitationEmail({
      name: lead.name || 'there',
      email: lead.email,
      businessName: lead.business_name
    })

    if (!emailResult.success) {
      console.error('Error sending beta invitation email:', emailResult.error)
      // Don't fail the request if email fails, but log it
      return res.status(200).json({
        success: true,
        warning: 'Lead status updated but email failed to send'
      })
    }

    console.log('[invite-to-beta] Successfully invited lead:', leadId, 'to beta')
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in invite-to-beta API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
