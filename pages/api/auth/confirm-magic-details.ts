import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Save owner name (and optionally business name) for magic-link signup flow.
 * Called from /join/confirm-details after first magic link login.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const ownerName = String(req.body?.ownerName ?? '').trim()
    if (!ownerName) {
      return res.status(400).json({ error: 'Your name is required' })
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    await supabaseAdmin
      .from('businesses')
      .update({ owner_name: ownerName })
      .eq('id', business.id)

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, full_name: ownerName },
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[confirm-magic-details] Error:', error)
    return res.status(500).json({ error: 'Something went wrong' })
  }
}
