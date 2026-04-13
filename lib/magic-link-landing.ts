import type { NextApiResponse } from 'next';

export type MagicLandingNext = 'dashboard' | 'google-confirm';

export function setMagicNextCookie(res: NextApiResponse, next: MagicLandingNext) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `rf_magic_next=${next}; Path=/; Max-Age=600; SameSite=Lax${secure}`
  );
}

export function magicLandingRedirectTo(appBase: string, next: MagicLandingNext): string {
  const base = appBase.replace(/\/$/, '');
  return `${base}/auth/magic-landing?next=${next}`;
}

export function parseMagicLandingNext(value: unknown): MagicLandingNext | null {
  if (value === 'google-confirm' || value === 'dashboard') return value;
  if (Array.isArray(value) && value[0]) {
    return parseMagicLandingNext(value[0]);
  }
  return null;
}
