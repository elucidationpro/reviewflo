import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  exchangeCodeForTokens,
  getPlaceIdFromGoogleBusinessProfile,
} from '../../../../lib/google-business-profile';
import {
  generateSlugFromBusinessName,
  isReservedSlug,
  normalizeSlugForValidation,
} from '../../../../lib/slug-utils';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * OAuth callback for "Sign up with Google".
 *
 * Flow:
 * 1. User clicks "Continue with Google" on /join
 * 2. Google OAuth with openid + profile + email + business.manage scopes
 * 3. Google redirects here with code
 * 4. Exchange code for tokens
 * 5. Fetch Google profile (name, email)
 * 6. Fetch GBP business name + Place ID
 * 7. Create Supabase user + business record
 * 8. Generate magic link → redirect user through it to /join/google-confirm
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, error } = req.query;

    if (error) {
      console.error('[Google Signup] Auth error:', error);
      return res.redirect(`/join?error=${encodeURIComponent('Google sign-in was cancelled or failed.')}`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`/join?error=${encodeURIComponent('Missing authorization code')}`);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, 'signup');

    // Get Google user profile (name + email)
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const profile = await profileRes.json();

    if (!profile.email) {
      return res.redirect(`/join?error=${encodeURIComponent('Could not retrieve your Google account email.')}`);
    }

    const email: string = profile.email.toLowerCase();
    const name: string = profile.name || profile.given_name || '';

    // Check if account already exists (perPage 1000 to handle growing user base)
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = existingUser?.users?.find((u) => u.email === email);

    // Fetch GBP data (business name + Place ID)
    const gbpData = await getPlaceIdFromGoogleBusinessProfile(tokens.accessToken);
    const businessName = gbpData?.businessName || name || 'My Business';
    const placeId = gbpData?.placeId || null;

    // Build Google review URL if we have a Place ID
    const googleReviewUrl = placeId
      ? `https://search.google.com/local/writereview?placeid=${placeId}`
      : null;

    // If account exists, treat signup as login and link GBP data.
    if (existing) {
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      let { data: business } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('user_id', existing.id)
        .single();

      if (!business?.id) {
        let baseSlug = generateSlugFromBusinessName(businessName) || 'my-business';
        if (baseSlug.length < 3) baseSlug = baseSlug.padEnd(3, '0');
        let slug = baseSlug;
        let attempt = 0;
        while (true) {
          const candidate = attempt === 0 ? slug : `${baseSlug.slice(0, 27)}-${attempt}`;
          const normalized = normalizeSlugForValidation(candidate);
          if (!isReservedSlug(normalized)) {
            const { data: existingSlug } = await supabaseAdmin
              .from('businesses')
              .select('id')
              .eq('slug', normalized)
              .single();
            if (!existingSlug) {
              slug = normalized;
              break;
            }
          }
          attempt++;
          if (attempt > 99) {
            slug = `${baseSlug.slice(0, 24)}-${Date.now().toString().slice(-5)}`;
            break;
          }
        }

        const { data: createdBusiness } = await supabaseAdmin
          .from('businesses')
          .insert({
            user_id: existing.id,
            business_name: businessName,
            owner_email: email,
            slug,
            primary_color: '#3B82F6',
            logo_url: null,
            google_review_url: googleReviewUrl,
            google_place_id: placeId,
            google_oauth_access_token: tokens.accessToken,
            google_oauth_refresh_token: tokens.refreshToken || null,
            google_oauth_expires_at: expiresAt.toISOString(),
            google_business_name: businessName,
            facebook_review_url: null,
            yelp_review_url: null,
            nextdoor_review_url: null,
            terms_accepted_at: new Date().toISOString(),
            tier: 'free',
            launch_discount_eligible: true,
          })
          .select('id')
          .single();
        business = createdBusiness || null;
      } else {
        await supabaseAdmin
          .from('businesses')
          .update({
            google_place_id: placeId,
            google_review_url: googleReviewUrl,
            google_oauth_access_token: tokens.accessToken,
            ...(tokens.refreshToken ? { google_oauth_refresh_token: tokens.refreshToken } : {}),
            google_oauth_expires_at: expiresAt.toISOString(),
            google_business_name: businessName,
          })
          .eq('id', business.id);
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        },
      });
      if (linkError || !linkData?.properties?.action_link) {
        return res.redirect(`/login?error=${encodeURIComponent('Unable to sign you in. Please try again.')}`);
      }
      return res.redirect(linkData.properties.action_link);
    }

    // Generate a slug from the business name, ensuring uniqueness
    let baseSlug = generateSlugFromBusinessName(businessName) || 'my-business';
    // Ensure minimum length
    if (baseSlug.length < 3) baseSlug = baseSlug.padEnd(3, '0');

    let slug = baseSlug;
    let attempt = 0;
    while (true) {
      const candidate = attempt === 0 ? slug : `${baseSlug.slice(0, 27)}-${attempt}`;
      const normalized = normalizeSlugForValidation(candidate);
      if (!isReservedSlug(normalized)) {
        const { data: existing } = await supabaseAdmin
          .from('businesses')
          .select('id')
          .eq('slug', normalized)
          .single();
        if (!existing) {
          slug = normalized;
          break;
        }
      }
      attempt++;
      if (attempt > 99) {
        slug = `${baseSlug.slice(0, 24)}-${Date.now().toString().slice(-5)}`;
        break;
      }
    }

    // Create Supabase auth user (no password — they'll use magic links to log in)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        owner_name: name,
        business_name: businessName,
        signup_method: 'google',
      },
    });

    if (authError || !authData.user) {
      console.error('[Google Signup] Failed to create user:', authError);
      return res.redirect(`/join?error=${encodeURIComponent('Failed to create your account. Please try again.')}`);
    }

    const userId = authData.user.id;

    // Create business record
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        user_id: userId,
        business_name: businessName,
        owner_email: email,
        slug,
        primary_color: '#3B82F6',
        logo_url: null,
        google_review_url: googleReviewUrl,
        google_place_id: placeId,
        google_oauth_access_token: tokens.accessToken,
        ...(tokens.refreshToken ? { google_oauth_refresh_token: tokens.refreshToken } : {}),
        google_oauth_expires_at: expiresAt.toISOString(),
        google_business_name: businessName,
        facebook_review_url: null,
        yelp_review_url: null,
        nextdoor_review_url: null,
        terms_accepted_at: new Date().toISOString(),
        tier: 'free',
        launch_discount_eligible: true,
      })
      .select()
      .single();

    if (businessError || !business) {
      console.error('[Google Signup] Failed to create business:', businessError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return res.redirect(`/join?error=${encodeURIComponent('Failed to create your account. Please try again.')}`);
    }

    // Create 3 default review templates
    await supabaseAdmin.from('review_templates').insert([
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
    ]);

    // Generate a magic link to sign the user in and send them to the confirm page
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/join/google-confirm`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[Google Signup] Failed to generate magic link:', linkError);
      // Fall back to just redirecting to login
      return res.redirect(`/login?success=${encodeURIComponent('Account created! Log in with the magic link.')}`);
    }

    return res.redirect(linkData.properties.action_link);
  } catch (error) {
    console.error('[Google Signup] Callback error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return res.redirect(`/join?error=${encodeURIComponent(`Something went wrong: ${msg}`)}`);
  }
}
