import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const email = user.email;
    const businessName = user.user_metadata?.business_name;
    const slug = user.user_metadata?.slug;

    if (!email || !businessName || !slug) {
      return res.status(400).json({ error: 'Missing signup data. Please try the signup link again.' });
    }

    // Check if business already exists for this user
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id, slug')
      .eq('user_id', user.id)
      .single();

    if (existingBusiness) {
      return res.status(200).json({ success: true, existing: true });
    }

    // Create business record
    const businessInsert = {
      user_id: user.id,
      business_name: businessName,
      owner_email: email,
      slug: slug,
      primary_color: '#3B82F6',
      logo_url: null,
      google_review_url: null,
      facebook_review_url: null,
      yelp_review_url: null,
      nextdoor_review_url: null,
      terms_accepted_at: new Date().toISOString(),
    };

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert(businessInsert)
      .select()
      .single();

    if (businessError || !business) {
      console.error('[complete-magic-link] Business creation failed:', businessError);
      return res.status(500).json({ error: 'Failed to create your account. Please try again or contact support.' });
    }

    // Create 3 default templates
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
    ];

    await supabaseAdmin
      .from('review_templates')
      .insert(templatesToCreate);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[complete-magic-link] Unexpected error:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
