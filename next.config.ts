import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/for/lash-studios",
        destination: "/for/eyebrow-lash-studios",
        permanent: true,
      },
      {
        source: "/for/pool-service",
        destination: "/for/pool-cleaning",
        permanent: true,
      },
      {
        source: "/for/mobile-pet-groomers",
        destination: "/for/mobile-dog-grooming",
        permanent: true,
      },
      {
        source: "/for/accounting-firms",
        destination: "/for/tax-preparation",
        permanent: true,
      },
      {
        source: "/for/financial-advisors",
        destination: "/for/law-offices",
        permanent: true,
      },
      {
        source: "/for/insurance-agents",
        destination: "/for/real-estate-agents",
        permanent: true,
      },
      {
        source: "/for/mortgage-brokers",
        destination: "/for/real-estate-agents",
        permanent: true,
      },
      {
        source: "/for-barbers",
        destination: "/for/barber-shops",
        permanent: true,
      },
      {
        source: "/for-mobile-detailing",
        destination: "/for/mobile-auto-detailing",
        permanent: true,
      },
      {
        source: "/for-nail-salons",
        destination: "/for/nail-salons",
        permanent: true,
      },
      {
        source: "/for-pressure-washing",
        destination: "/for/pressure-washing",
        permanent: true,
      },
      {
        source: "/for-hair-salons",
        destination: "/for/hair-salons",
        permanent: true,
      },
      // Kova Wash slug redirect: old slug had no dash, new one does
      {
        source: "/obsidianauto",
        destination: "/obsidian-auto",
        permanent: true,
      },
    ];
  },
  // Do not redirect www ↔ apex here. Vercel’s “primary domain” already canonicalizes
  // hostnames; a second redirect in Next.js can fight it and cause redirect loops.
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
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://usereviewflo.com https://*.supabase.co https://*.posthog.com https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com",
      "script-src-elem 'self' 'unsafe-inline' https://usereviewflo.com https://*.supabase.co https://*.posthog.com https://connect.facebook.net https://www.facebook.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.posthog.com wss://*.supabase.co https://connect.facebook.net https://www.facebook.com https://*.facebook.com https://www.googletagmanager.com https://www.google-analytics.com https://*.a.run.app https://*.conversionsapigateway.com",
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
