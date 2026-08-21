import type { NextApiRequest, NextApiResponse } from 'next';
import { getAppBaseUrl } from '@/lib/app-base-url';
import {
  createOAuthState,
  setOAuthStateCookie,
} from '@/lib/google-oauth-csrf';

/**
 * Starts Google OAuth for login or signup with a CSRF `state` cookie + query param.
 * Avoids building the auth URL in the browser (no `state` there).
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const flow = req.query.flow;
  if (flow !== 'login' && flow !== 'signup') {
    return res.status(400).send('Invalid flow');
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID;
  const baseUrl = getAppBaseUrl(req);
  if (!clientId || !baseUrl) {
    return res.status(500).send('OAuth is not configured');
  }

  const callbackPath =
    flow === 'login'
      ? '/api/auth/google/login-callback'
      : '/api/auth/google/signup-callback';
  const redirectUri = `${baseUrl}${callbackPath}`;
  // Sign-in requests identity scopes only. Business Profile access is a sensitive scope,
  // and Google's granular consent renders it as an optional checkbox when bundled with
  // sign-in — users click through without ticking it, so the token comes back sign-in-only
  // and every GBP call 403s. It is requested separately, on its own, from the onboarding
  // confirm step and from Settings, where granting it is the whole point of the click.
  const scope = 'openid profile email';

  const state = createOAuthState();
  setOAuthStateCookie(res, state);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  // No offline access or forced consent on sign-in: identity scopes need no refresh token,
  // and prompt=consent re-showed the full permission screen on every single sign-in.
  // Offline access lives on the Business Profile connect flow, where it is actually used.

  return res.redirect(302, authUrl.toString());
}
