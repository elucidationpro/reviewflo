import type { NextApiRequest } from 'next';

/**
 * Base URL for OAuth redirect_uri, Supabase magic-link redirectTo, etc.
 *
 * In **development**, uses the incoming request host so any localhost port (or tunnel)
 * works without NEXT_PUBLIC_APP_URL matching the running server.
 *
 * In **production**, uses NEXT_PUBLIC_APP_URL (set on Vercel).
 */
export function getAppBaseUrl(req: NextApiRequest): string {
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  if (process.env.NODE_ENV !== 'development') {
    return envUrl;
  }

  const host = req.headers.host;
  if (!host) {
    return envUrl;
  }

  const forwarded = req.headers['x-forwarded-proto'];
  const proto =
    typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : 'http';

  return `${proto}://${host}`;
}
