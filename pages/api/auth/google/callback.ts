import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAppBaseUrl } from '@/lib/app-base-url';
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

    // State contains the user's session token, optionally followed by
    // `|<businessId>` to target a specific location (multi-location flow).
    if (!state || typeof state !== 'string') {
      return res.redirect(`/settings?error=${encodeURIComponent('Invalid session')}`);
    }

    const pipeIdx = state.indexOf('|');
    const sessionToken = pipeIdx === -1 ? state : state.slice(0, pipeIdx);
    const targetBusinessId = pipeIdx === -1 ? null : state.slice(pipeIdx + 1) || null;

    // Verify the session token and get the user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(sessionToken);

    if (authError || !user) {
      console.error('[Google OAuth] Invalid session:', authError);
      return res.redirect(`/settings?error=${encodeURIComponent('Invalid session')}`);
    }

    // Resolve the target business row. If a businessId is supplied, validate
    // ownership; otherwise fall back to the primary (parent_business_id IS NULL).
    let targetBusiness: { id: string; google_place_id: string | null; google_review_url: string | null; google_business_name: string | null } | null = null;
    if (targetBusinessId) {
      const { data, error: lookupErr } = await supabaseAdmin
        .from('businesses')
        .select('id, user_id, google_place_id, google_review_url, google_business_name')
        .eq('id', targetBusinessId)
        .single();
      if (lookupErr || !data || data.user_id !== user.id) {
        console.error('[Google OAuth] Invalid businessId in state:', targetBusinessId);
        return res.redirect(`/settings?error=${encodeURIComponent('Invalid location')}`);
      }
      targetBusiness = {
        id: data.id,
        google_place_id: data.google_place_id,
        google_review_url: data.google_review_url,
        google_business_name: data.google_business_name,
      };
    } else {
      const { data } = await supabaseAdmin
        .from('businesses')
        .select('id, google_place_id, google_review_url, google_business_name')
        .eq('user_id', user.id)
        .is('parent_business_id', null)
        .single();
      if (data) targetBusiness = data;
    }

    if (!targetBusiness) {
      return res.redirect(`/settings?error=${encodeURIComponent('No business found for this account')}`);
    }

    // Exchange authorization code for tokens
    console.log('[Google OAuth] Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code, 'settings', getAppBaseUrl(req));

    // Fetch Place ID from Google Business Profile (best effort; still save OAuth tokens even if GBP lookup fails)
    console.log('[Google OAuth] Fetching Place ID from Business Profile...');
    const businessData = await getPlaceIdFromGoogleBusinessProfile(tokens.accessToken);

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const newPlaceId = businessData?.placeId ?? null;
    const mergedPlaceId = newPlaceId ?? targetBusiness.google_place_id ?? null;
    const googleReviewUrl = newPlaceId
      ? `https://search.google.com/local/writereview?placeid=${newPlaceId}`
      : targetBusiness.google_review_url ?? null;
    const mergedBusinessName =
      businessData?.businessName ?? targetBusiness.google_business_name ?? null;

    // Store tokens, Place ID, and review URL on the specific location row only.
    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        google_place_id: mergedPlaceId,
        google_review_url: googleReviewUrl,
        google_oauth_access_token: tokens.accessToken,
        ...(tokens.refreshToken ? { google_oauth_refresh_token: tokens.refreshToken } : {}),
        google_oauth_expires_at: expiresAt.toISOString(),
        google_business_name: mergedBusinessName,
      })
      .eq('id', targetBusiness.id);

    if (updateError) {
      console.error('[Google OAuth] Failed to update business:', updateError);
      return res.redirect(
        `/settings?error=${encodeURIComponent('Failed to save Google Business Profile data')}`
      );
    }

    console.log('[Google OAuth] Successfully connected Google Business Profile');
    console.log('[Google OAuth] Place ID:', businessData?.placeId ?? '(none — service-area business)');

    // Redirect back to settings with success message
    const successMsg = businessData?.placeId
      ? 'Google Business Profile connected successfully!'
      : 'Google connected. We saved your account access, but could not auto-detect a GBP location yet. You can still add your Google review URL manually in Settings.';

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
