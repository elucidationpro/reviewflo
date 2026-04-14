import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Canonicalize hosts that should land on this Vercel project.
// NOTE: `reviewflo.com` is not currently attached to this Vercel project, so redirecting to it
// can send users to a different site depending on DNS/Vercel domain assignment.
// Vercel currently treats `www.usereviewflo.com` as the primary domain for this project.
// Align app-level redirects with that to avoid Vercel ↔ middleware redirect loops.
const PRIMARY_HOST = 'www.usereviewflo.com';
const LEGACY_HOSTS = new Set(['usereviewflo.com']);

export function middleware(req: NextRequest) {
  const host = req.nextUrl.hostname.toLowerCase();

  // Only redirect idempotent requests (keeps POST webhooks safer).
  if ((req.method === 'GET' || req.method === 'HEAD') && LEGACY_HOSTS.has(host)) {
    const url = req.nextUrl.clone();
    url.hostname = PRIMARY_HOST;
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)'],
};

