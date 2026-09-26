import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  clearOAuthStateCookie,
  verifyGoogleOAuthState,
} from '@/lib/google-oauth-csrf';
import {
  exchangeCodeForTokens,
  getPlaceIdFromGoogleBusinessProfile,
  grantIncludesGbpScope,
} from '../../../../lib/google-business-profile';
import { getAppBaseUrl } from '@/lib/app-base-url';
import {
  generateSlugFromBusinessName,
  isReservedSlug,
  normalizeSlugForValidation,
} from '../../../../lib/slug-utils';
import {
  magicLandingRedirectTo,
  setMagicNextCookie,
} from '@/lib/magic-link-landing';
import { isAdminEmail } from '@/lib/admin-policy';

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
    const { code, error, state } = req.query;

    if (error) {
      console.error('[Google Login] Auth error:', error);
      clearOAuthStateCookie(res);
      return res.redirect(`/login?error=${encodeURIComponent('Google sign-in was cancelled or failed.')}`);
    }

    if (!code || typeof code !== 'string') {
      clearOAuthStateCookie(res);
      return res.redirect(`/login?error=${encodeURIComponent('Missing authorization code')}`);
    }

    const stateOk = verifyGoogleOAuthState(
      req,
      res,
      typeof state === 'string' ? state : ''
    );
    if (!stateOk) {
      return res.redirect(
        `/login?error=${encodeURIComponent('Sign-in session expired. Please try again.')}`
      );
    }

    const appBase = getAppBaseUrl(req);
    const tokens = await exchangeCodeForTokens(code, 'login', appBase);
    const accessToken = tokens.accessToken;

    // Get Google user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const profile = await profileRes.json();

    if (!profileRes.ok || !profile.email || profile.verified_email !== true) {
      return res.redirect(`/login?error=${encodeURIComponent('Could not retrieve your Google account email.')}`);
    }

    const email: string = profile.email.toLowerCase();
    const ownerName: string = profile.name || profile.given_name || '';

    // Admin login — internal admin access is email-gated and has nothing to do with
    // being a ReviewFlo customer. Skip business creation entirely; just authenticate
    // and send them to /admin.
    if (isAdminEmail(email)) {
      const { data: adminUsersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      let adminUser = adminUsersData?.users?.find((u) => u.email === email);
      if (!adminUser) {
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { owner_name: ownerName },
        });
        if (createError || !authData.user) {
          return res.redirect(`/login?error=${encodeURIComponent('Failed to create account from Google sign-in.')}`);
        }
        adminUser = authData.user;
      }
      setMagicNextCookie(res, 'admin');
      const { data: adminLinkData, error: adminLinkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: magicLandingRedirectTo(appBase, 'admin') },
      });
      if (adminLinkError || !adminLinkData?.properties?.action_link) {
        return res.redirect(`/login?error=${encodeURIComponent('Failed to sign you in. Please try again.')}`);
      }
      return res.redirect(adminLinkData.properties.action_link);
    }

    // Try to fetch GBP data, but don't block auth if this fails. Only attempted when the
    // grant actually carries business.manage — sign-in no longer requests it, so this is
    // normally skipped and the confirm step collects the name instead.
    let gbpData: Awaited<ReturnType<typeof getPlaceIdFromGoogleBusinessProfile>> = null;
    if (grantIncludesGbpScope(tokens.scope)) {
      try {
        gbpData = await getPlaceIdFromGoogleBusinessProfile(accessToken);
      } catch (e) {
        console.warn('[Google Login] GBP lookup failed (non-blocking):', e);
      }
    }
    // When GBP fails: use placeholder; owner name stored separately for client emails
    // Only a name Google actually returned is a real name. Anything else stays blank so the
    // confirm step is forced to collect one, rather than silently shipping 'My Business'.
    const realBusinessName = gbpData?.businessName || '';
    const inferredBusinessName = realBusinessName || 'My Business';
    const inferredPlaceId = gbpData?.placeId || null;

    const buildUniqueSlug = async (businessName: string) => {
      let baseSlug = generateSlugFromBusinessName(businessName) || 'my-business';
      if (baseSlug.length < 3) baseSlug = baseSlug.padEnd(3, '0');

      let attempt = 0;
      while (attempt <= 99) {
        const candidate = attempt === 0 ? baseSlug : `${baseSlug.slice(0, 27)}-${attempt}`;
        const normalized = normalizeSlugForValidation(candidate);
        if (!isReservedSlug(normalized)) {
          const { data: existing } = await supabaseAdmin
            .from('businesses')
            .select('id')
            .eq('slug', normalized)
            .single();
          if (!existing) return normalized;
        }
        attempt++;
      }
      return `${baseSlug.slice(0, 24)}-${Date.now().toString().slice(-5)}`;
    };

    let businessNeedsConfirm = false;

    const ensureBusinessAndLinkGoogle = async (userId: string) => {
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('id, google_place_id, google_review_url, business_name')
        .eq('user_id', userId)
        .is('parent_business_id', null)
        .maybeSingle();

      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
      const mergedPlaceId = inferredPlaceId ?? business?.google_place_id ?? null;
      const googleReviewUrl = inferredPlaceId
        ? `https://search.google.com/local/writereview?placeid=${inferredPlaceId}`
        : business?.google_review_url ?? null;

      if (business?.id) {
        // Flag for redirect: no name yet or still has the fallback placeholder
        const name = business.business_name || '';
        if (!name || name === 'My Business') businessNeedsConfirm = true;

        if (grantIncludesGbpScope(tokens.scope)) await supabaseAdmin
          .from('businesses')
          .update({
            google_place_id: mergedPlaceId,
            google_review_url: googleReviewUrl,
            google_oauth_access_token: accessToken,
            ...(tokens.refreshToken ? { google_oauth_refresh_token: tokens.refreshToken } : {}),
            google_oauth_expires_at: expiresAt,
            google_business_name: realBusinessName || null,
          })
          .eq('id', business.id);
        return;
      }

      const slug = await buildUniqueSlug(inferredBusinessName);
      const { data: createdBusiness } = await supabaseAdmin
        .from('businesses')
        .insert({
          user_id: userId,
          business_name: realBusinessName,
          owner_email: email,
          owner_name: ownerName || null,
          slug,
          primary_color: '#3B82F6',
          logo_url: null,
          skip_template_choice: true,
          google_review_url: googleReviewUrl,
          google_place_id: inferredPlaceId,
          google_oauth_access_token: accessToken,
          ...(tokens.refreshToken ? { google_oauth_refresh_token: tokens.refreshToken } : {}),
          google_oauth_expires_at: expiresAt,
          google_business_name: realBusinessName || null,
          facebook_review_url: null,
          yelp_review_url: null,
          nextdoor_review_url: null,
          terms_accepted_at: new Date().toISOString(),
          tier: 'free',
          launch_discount_eligible: true,
        })
        .select('id')
        .single();

      if (createdBusiness?.id) {
        await supabaseAdmin.from('review_templates').insert([
          {
            business_id: createdBusiness.id,
            platform: 'google',
            template_text: `I had an excellent experience with ${inferredBusinessName}! They exceeded my expectations. Highly recommend!`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            business_id: createdBusiness.id,
            platform: 'facebook',
            template_text: `Just had a great experience with ${inferredBusinessName}! Professional service and fantastic results. 5 stars! ⭐⭐⭐⭐⭐`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            business_id: createdBusiness.id,
            platform: 'yelp',
            template_text: `5 stars for ${inferredBusinessName}! Quality work, professional service, and fair pricing. Will definitely use again.`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }
    };

    // Find existing user by email (perPage 1000 to handle growing user base)
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = usersData?.users?.find((u) => u.email === email);

    // Log in must never create an account. Silently provisioning one here is how a user who
    // picks the wrong Google account in the chooser ends up with a second, empty business
    // ('My Business' / my-business-N) while their real one still exists under another email.
    // Send them to signup with the address they actually used, so the choice is explicit.
    if (!user) {
      return res.redirect(
        `/join?error=${encodeURIComponent(
          `No ReviewFlo account found for ${email}. If you already have an account, sign in with the Google account you signed up with. Otherwise you can create one below.`
        )}`
      );
    }

    await ensureBusinessAndLinkGoogle(user.id);

    const magicNext = businessNeedsConfirm ? 'google-confirm' : 'dashboard';
    setMagicNextCookie(res, magicNext);

    // Generate a magic link to sign the user in
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: magicLandingRedirectTo(appBase, magicNext),
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
