import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  exchangeCodeForTokens,
  getPlaceIdFromGoogleBusinessProfile,
} from '../../../../lib/google-business-profile';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * OAuth callback for "Continue with Google" on the login page.
 *
 * Flow:
 * 1. User clicks "Continue with Google" on /login
 * 2. Google OAuth with openid + profile + email + business.manage scopes
 * 3. Google redirects here with code
 * 4. Exchange code for access/refresh tokens
 * 5. Fetch Google profile email
 * 6. Find existing Supabase user by email
 * 7. If we have business.manage, fetch GBP data and link/update the business (place ID, review URL, tokens)
 * 8. Generate magic link → redirect user through it to /dashboard
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, error } = req.query;

    if (error) {
      console.error('[Google Login] Auth error:', error);
      return res.redirect(`/login?error=${encodeURIComponent('Google sign-in was cancelled or failed.')}`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`/login?error=${encodeURIComponent('Missing authorization code')}`);
    }

    const tokens = await exchangeCodeForTokens(code, 'login');
    const accessToken = tokens.accessToken;

    // Get Google user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();

    if (!profile.email) {
      return res.redirect(`/login?error=${encodeURIComponent('Could not retrieve your Google account email.')}`);
    }

    const email: string = profile.email.toLowerCase();

    // Find existing user by email (perPage 1000 to handle growing user base)
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingUser = usersData?.users?.find((u) => u.email === email);

    if (!existingUser) {
      return res.redirect(
        `/login?error=${encodeURIComponent('No account found for this Google email. Please sign up first.')}`
      );
    }

    // Fetch GBP data and link if we have business.manage (from refresh_token or scope)
    if (tokens.refreshToken) {
      try {
        const gbpData = await getPlaceIdFromGoogleBusinessProfile(accessToken);
        if (gbpData) {
          const { data: business } = await supabaseAdmin
            .from('businesses')
            .select('id')
            .eq('user_id', existingUser.id)
            .single();

          if (business) {
            const placeId = gbpData.placeId ?? null;
            const googleReviewUrl = placeId
              ? `https://search.google.com/local/writereview?placeid=${placeId}`
              : null;
            const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

            await supabaseAdmin
              .from('businesses')
              .update({
                google_place_id: placeId,
                google_review_url: googleReviewUrl,
                google_oauth_access_token: accessToken,
                google_oauth_refresh_token: tokens.refreshToken,
                google_oauth_expires_at: expiresAt.toISOString(),
                google_business_name: gbpData.businessName,
              })
              .eq('id', business.id);
          }
        }
      } catch (e) {
        console.warn('[Google Login] GBP link failed (non-blocking):', e);
      }
    }

    // Generate a magic link to sign the user in
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[Google Login] Failed to generate magic link:', linkError);
      return res.redirect(`/login?error=${encodeURIComponent('Failed to sign you in. Please try again.')}`);
    }

    return res.redirect(linkData.properties.action_link);
  } catch (err) {
    console.error('[Google Login] Callback error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return res.redirect(`/login?error=${encodeURIComponent(`Something went wrong: ${msg}`)}`);
  }
}
