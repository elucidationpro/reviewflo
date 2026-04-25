import type { NextApiRequest } from 'next';

/**
 * Base URL for Google OAuth `redirect_uri` on the server (token exchange must match
 * the exact `redirect_uri` the browser sent to Google).
 *
 * Always prefers the **incoming request** host + scheme (via `Host` / `X-Forwarded-Host`
 * and `X-Forwarded-Proto`). That fixes www vs apex mismatches when `NEXT_PUBLIC_APP_URL`
 * only lists one hostname.
 *
 * Falls back to `NEXT_PUBLIC_APP_URL` if host headers are missing.
 */
export function getAppBaseUrl(req: NextApiRequest): string {
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  const forwardedHost = req.headers['x-forwarded-host'];
  const hostHeader = req.headers.host;

  const rawHost =
    (typeof forwardedHost === 'string'
      ? forwardedHost.split(',')[0]
      : Array.isArray(forwardedHost)
        ? forwardedHost[0]
        : null) ||
    (typeof hostHeader === 'string' ? hostHeader : hostHeader?.[0]) ||
    '';

  const host = rawHost.trim();
  if (host) {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto =
      typeof forwardedProto === 'string'
        ? forwardedProto.split(',')[0].trim()
        : process.env.NODE_ENV === 'development'
          ? 'http'
          : 'https';
    return `${proto}://${host}`;
  }

  return envUrl;
}
