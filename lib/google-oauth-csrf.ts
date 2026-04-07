import { randomBytes } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

export const GOOGLE_OAUTH_STATE_COOKIE = 'rf_google_oauth_state';

export function createOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

function readRawCookie(req: NextApiRequest, name: string): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return;
  for (const part of raw.split(';')) {
    const trimmed = part.trim();
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    const key = trimmed.slice(0, i).trim();
    if (key !== name) continue;
    return decodeURIComponent(trimmed.slice(i + 1).trim());
  }
  return;
}

export function setOAuthStateCookie(res: NextApiResponse, state: string) {
  const secure = process.env.NODE_ENV === 'production';
  const segments = [
    `${GOOGLE_OAUTH_STATE_COOKIE}=${encodeURIComponent(state)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=600',
  ];
  if (secure) segments.push('Secure');
  res.appendHeader('Set-Cookie', segments.join('; '));
}

export function clearOAuthStateCookie(res: NextApiResponse) {
  const secure = process.env.NODE_ENV === 'production';
  const segments = [
    `${GOOGLE_OAUTH_STATE_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure) segments.push('Secure');
  res.appendHeader('Set-Cookie', segments.join('; '));
}

/** Validates `state` from Google’s redirect, clears the cookie, returns whether it matched. */
export function verifyGoogleOAuthState(
  req: NextApiRequest,
  res: NextApiResponse,
  stateFromQuery: string
): boolean {
  const expected = readRawCookie(req, GOOGLE_OAUTH_STATE_COOKIE);
  clearOAuthStateCookie(res);
  return Boolean(
    stateFromQuery &&
      expected &&
      stateFromQuery.length > 0 &&
      expected.length > 0 &&
      stateFromQuery === expected
  );
}
