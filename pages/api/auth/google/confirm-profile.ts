import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import {
  generateSlugFromBusinessName,
  isReservedSlug,
  normalizeSlugForValidation,
} from '../../../../lib/slug-utils'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function buildUniqueSlug(businessName: string): Promise<string> {
  let baseSlug = generateSlugFromBusinessName(businessName) || 'my-business'
  if (baseSlug.length < 3) baseSlug = baseSlug.padEnd(3, '0')

  let attempt = 0
  while (attempt <= 99) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 27)}-${attempt}`
    const normalized = normalizeSlugForValidation(candidate)
    if (!isReservedSlug(normalized)) {
      const { data: existing } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('slug', normalized)
        .single()
      if (!existing) return normalized
    }
    attempt++
  }

  return `${baseSlug.slice(0, 24)}-${Date.now().toString().slice(-5)}`
}

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

    const businessName = String(req.body?.businessName || '').trim()
    if (!businessName) {
      return res.status(400).json({ error: 'Business name is required' })
    }

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    const slug = await buildUniqueSlug(businessName)
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        business_name: businessName,
        slug,
      })
      .eq('id', business.id)

    if (updateError) {
      return res.status(500).json({ error: 'Failed to save business profile' })
    }

    return res.status(200).json({ success: true, slug })
  } catch (error) {
    console.error('[google-confirm-profile] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
