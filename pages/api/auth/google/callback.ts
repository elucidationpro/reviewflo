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
 * OAuth callback handler for Google Business Profile
 *
 * Flow:
 * 1. User clicks "Connect Google Business Profile" in settings
 * 2. Redirected to Google OAuth consent screen
 * 3. User authorizes access
 * 4. Google redirects here with authorization code
 * 5. Exchange code for access/refresh tokens
 * 6. Fetch Place ID from Business Profile API
 * 7. Store tokens and Place ID in database
 * 8. Redirect back to settings
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('[Google OAuth] Authorization error:', error);
      return res.redirect(
        `/settings?error=${encodeURIComponent('Google authorization failed')}`
      );
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`/settings?error=${encodeURIComponent('Missing authorization code')}`);
    }

    // State contains the user's session token
    if (!state || typeof state !== 'string') {
      return res.redirect(`/settings?error=${encodeURIComponent('Invalid session')}`);
    }

    // Verify the session token and get the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(state);

    if (authError || !user) {
      console.error('[Google OAuth] Invalid session:', authError);
      return res.redirect(`/settings?error=${encodeURIComponent('Invalid session')}`);
    }

    // Exchange authorization code for tokens
    console.log('[Google OAuth] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);

    // Fetch Place ID from Google Business Profile
    console.log('[Google OAuth] Fetching Place ID from Business Profile...');
    const businessData = await getPlaceIdFromGoogleBusinessProfile(tokens.accessToken);

    if (!businessData) {
      return res.redirect(
        `/settings?error=${encodeURIComponent(
          'No business locations found. Make sure you have a Google Business Profile.'
        )}`
      );
    }

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    // Build Google review URL from Place ID for the review page
    const googleReviewUrl = businessData.placeId
      ? `https://search.google.com/local/writereview?placeid=${businessData.placeId}`
      : null;

    // Store tokens, Place ID, and review URL in database
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        google_place_id: businessData.placeId,
        google_review_url: googleReviewUrl,
        google_oauth_access_token: tokens.accessToken,
        google_oauth_refresh_token: tokens.refreshToken,
        google_oauth_expires_at: expiresAt.toISOString(),
        google_business_name: businessData.businessName,
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Google OAuth] Failed to update business:', updateError);
      return res.redirect(
        `/settings?error=${encodeURIComponent('Failed to save Google Business Profile data')}`
      );
    }

    console.log('[Google OAuth] Successfully connected Google Business Profile');
    console.log('[Google OAuth] Place ID:', businessData.placeId ?? '(none — service-area business)');

    // Redirect back to settings with success message
    const successMsg = businessData.placeId
      ? 'Google Business Profile connected successfully!'
      : 'Google Business Profile connected! No Place ID found — this may be a service-area business. Try refreshing stats or entering your Place ID manually.';

    return res.redirect(
      `/settings?success=${encodeURIComponent(successMsg)}`
    );
  } catch (error) {
    console.error('[Google OAuth] Callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Google OAuth] Error details:', errorMessage);
    return res.redirect(
      `/settings?error=${encodeURIComponent(`Failed to connect: ${errorMessage}`)}`
    );
  }
}
