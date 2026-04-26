import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PRIMARY_COLOR_DEFAULT = '#3B82F6'

function randomSuffix() {
  return Math.floor(Math.random() * 10000)
}

async function pickAvailableSlug(slugFromMetadata: string) {
  const base = String(slugFromMetadata || '').trim()
  if (!base) return null

  const attempts = [base, `${base}-${randomSuffix()}`, `${base}-${randomSuffix()}`]
  for (const candidate of attempts) {
    const { data: existing } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!existing) return candidate
  }

  return `${base}-${Date.now()}`
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
      return res.status(401).json({ error: 'Invalid or expired session' })
    }

    // If business already exists, nothing to do.
    const { data: existingBusiness, error: existingError } = await supabaseAdmin
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingError) {
      console.error('[recover-business] Existing business lookup failed:', existingError)
      return res.status(500).json({ error: 'Something went wrong' })
    }

    if (existingBusiness?.id) {
      return res.status(200).json({ exists: true })
    }

    const email = user.email
    const businessName = user.user_metadata?.business_name
    const slugFromMetadata = user.user_metadata?.slug

    if (!email || !businessName || !slugFromMetadata) {
      return res.status(400).json({ error: 'Missing signup data. Please contact support.' })
    }

    const slug = await pickAvailableSlug(String(slugFromMetadata))
    if (!slug) {
      return res.status(400).json({ error: 'Missing signup data. Please contact support.' })
    }

    const businessInsert = {
      user_id: user.id,
      business_name: String(businessName),
      owner_email: email,
      slug,
      primary_color: PRIMARY_COLOR_DEFAULT,
      logo_url: null,
      skip_template_choice: true,
      google_review_url: null,
      facebook_review_url: null,
      yelp_review_url: null,
      nextdoor_review_url: null,
      terms_accepted_at: new Date().toISOString(),
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert(businessInsert)
      .select()
      .single()

    if (businessError || !business) {
      console.error('[recover-business] Business creation failed:', businessError)
      return res.status(500).json({ error: 'Failed to recover business' })
    }

    const templatesToCreate = [
      {
        business_id: business.id,
        platform: 'google',
        template_text: `I had an excellent experience with ${businessName}! They exceeded my expectations. Highly recommend!`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        business_id: business.id,
        platform: 'facebook',
        template_text: `Just had a great experience with ${businessName}! Professional service and fantastic results. 5 stars! ⭐⭐⭐⭐⭐`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        business_id: business.id,
        platform: 'yelp',
        template_text: `5 stars for ${businessName}! Quality work, professional service, and fair pricing. Will definitely use again.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const { error: templatesError } = await supabaseAdmin
      .from('review_templates')
      .insert(templatesToCreate)

    if (templatesError) {
      console.error('[recover-business] Template creation failed:', templatesError)
      await supabaseAdmin.from('businesses').delete().eq('id', business.id)
      return res.status(500).json({ error: 'Failed to recover business' })
    }

    return res.status(200).json({ recovered: true })
  } catch (error) {
    console.error('[recover-business] Unexpected error:', error)
    return res.status(500).json({ error: 'Something went wrong' })
  }
}

