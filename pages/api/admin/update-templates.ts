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

interface UpdateTemplatesRequest {
  businessId: string
  googleTemplate?: string
  facebookTemplate?: string
  yelpTemplate?: string
}

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

    const {
      businessId,
      googleTemplate,
      facebookTemplate,
      yelpTemplate,
    } = req.body as UpdateTemplatesRequest

    // Validate required fields
    if (!businessId) {
      return res.status(400).json({ error: 'Missing business ID' })
    }

    // Fetch business to get business name for default templates
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('business_name')
      .eq('id', businessId)
      .single()

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' })
    }

    // Default templates
    const defaultTemplates = {
      google: 'I had an excellent experience with ' + business.business_name + '! They exceeded my expectations. Highly recommend!',
      facebook: 'Just had a great experience with ' + business.business_name + '! Professional service and fantastic results. 5 stars! ⭐⭐⭐⭐⭐',
      yelp: '5 stars for ' + business.business_name + '! Quality work, professional service, and fair pricing. Will definitely use again.'
    }

    const now = new Date().toISOString()

    // Update or insert templates using upsert
    const templatesData = [
      {
        business_id: businessId,
        platform: 'google',
        template_text: googleTemplate || defaultTemplates.google,
        updated_at: now
      },
      {
        business_id: businessId,
        platform: 'facebook',
        template_text: facebookTemplate || defaultTemplates.facebook,
        updated_at: now
      },
      {
        business_id: businessId,
        platform: 'yelp',
        template_text: yelpTemplate || defaultTemplates.yelp,
        updated_at: now
      }
    ]

    // Upsert templates (insert or update if exists based on business_id + platform)
    const { error: upsertError } = await supabaseAdmin
      .from('review_templates')
      .upsert(templatesData, {
        onConflict: 'business_id,platform',
        ignoreDuplicates: false
      })

    if (upsertError) {
      console.error('Error upserting templates:', upsertError)
      return res.status(500).json({ error: 'Failed to update templates' })
    }

    return res.status(200).json({
      success: true,
      message: 'Templates updated successfully'
    })
  } catch (error) {
    console.error('Error in update-templates API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
