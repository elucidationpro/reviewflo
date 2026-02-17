import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    const securityHeaders = [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    // HSTS and upgrade-insecure-requests break localhost (dev uses HTTP)
    if (!isDev) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      });
    }

    const cspParts = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://usereviewflo.com https://*.supabase.co https://*.posthog.com https://connect.facebook.net https://www.facebook.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.posthog.com wss://*.supabase.co https://www.facebook.com",
      "frame-src 'self' https://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ];
    if (!isDev) {
      cspParts.push("upgrade-insecure-requests");
    }

    securityHeaders.push({
      key: 'Content-Security-Policy',
      value: cspParts.join('; ')
    });

    return [
      { source: '/:path*', headers: securityHeaders },
    ];
  },
};

export default nextConfig;
