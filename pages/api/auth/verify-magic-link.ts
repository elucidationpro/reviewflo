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
  try {
    const { token_hash, type } = req.query;

    if (type !== 'magiclink' || !token_hash) {
      return res.redirect('/join?error=invalid_link');
    }

    // Verify the magic link token
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: token_hash as string,
      type: 'magiclink',
    });

    if (verifyError || !user) {
      console.error('[verify-magic-link] Verification failed:', verifyError);
      return res.redirect('/join?error=expired_link');
    }

    const email = user.email;
    const businessName = user.user_metadata?.business_name;
    const slug = user.user_metadata?.slug;

    if (!email || !businessName || !slug) {
      console.error('[verify-magic-link] Missing user metadata');
      return res.redirect('/join?error=invalid_data');
    }

    // Check if business already exists for this user
    const { data: existingBusiness } = await supabaseAdmin
      .from('businesses')
      .select('id, slug')
      .eq('user_id', user.id)
      .single();

    if (existingBusiness) {
      // User already has a business, just redirect to dashboard
      console.log('[verify-magic-link] Business already exists, redirecting to dashboard');
      return res.redirect('/dashboard');
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

    console.log('[verify-magic-link] Creating business for user:', user.id);

    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert(businessInsert)
      .select()
      .single();

    if (businessError || !business) {
      console.error('[verify-magic-link] Business creation failed:', businessError);
      return res.redirect('/join?error=setup_failed');
    }

    console.log('[verify-magic-link] Business created successfully:', business.id);

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

    const { error: templatesError } = await supabaseAdmin
      .from('review_templates')
      .insert(templatesToCreate);

    if (templatesError) {
      console.error('[verify-magic-link] Template creation failed:', templatesError);
      // Non-critical, continue anyway
    } else {
      console.log('[verify-magic-link] Templates created successfully');
    }

    // Update lead status to converted
    await supabaseAdmin
      .from('leads')
      .update({
        status: 'converted',
        business_id: business.id,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email);

    // Redirect to dashboard
    console.log('[verify-magic-link] Setup complete, redirecting to dashboard');
    return res.redirect('/dashboard');

  } catch (error) {
    console.error('[verify-magic-link] Unexpected error:', error);
    return res.redirect('/join?error=unknown');
  }
}
