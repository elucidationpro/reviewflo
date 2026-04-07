import type { NextApiRequest, NextApiResponse } from 'next';
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
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (!clientId || !baseUrl) {
    return res.status(500).send('OAuth is not configured');
  }

  const callbackPath =
    flow === 'login'
      ? '/api/auth/google/login-callback'
      : '/api/auth/google/signup-callback';
  const redirectUri = `${baseUrl}${callbackPath}`;
  const scope =
    'openid profile email https://www.googleapis.com/auth/business.manage';

  const state = createOAuthState();
  setOAuthStateCookie(res, state);

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  return res.redirect(302, authUrl.toString());
}
