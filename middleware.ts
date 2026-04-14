import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Canonicalize hosts that should land on this Vercel project.
// NOTE: `reviewflo.com` is not currently attached to this Vercel project, so redirecting to it
// can send users to a different site depending on DNS/Vercel domain assignment.
const PRIMARY_HOST = 'usereviewflo.com';
const LEGACY_HOSTS = new Set(['www.usereviewflo.com']);

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

