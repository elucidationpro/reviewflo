import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PRIMARY_HOST = 'reviewflo.com';
const LEGACY_HOSTS = new Set(['usereviewflo.com', 'www.usereviewflo.com']);

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

