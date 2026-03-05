'use client';

import Link from 'next/link';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

interface BlogPostLayoutProps {
  children: React.ReactNode;
}

export function BlogPostLayout({ children }: BlogPostLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav variant="marketing" />
      <div className={SITE_NAV_SPACER_CLASS} />
      {children}
      <SiteFooter />
    </div>
  );
}

export function BlogPostCTA() {
  return (
    <section className="bg-gray-50 rounded-xl p-6 sm:p-8 border border-gray-200 mt-10">
      <h2 className="text-xl font-semibold text-gray-900 mb-3">
        Ready to get started?
      </h2>
      <p className="mb-4 text-gray-600">
        ReviewFlo routes unhappy customers (1–3 stars) to private feedback and happy customers (4–5 stars) to Google. Start your free trial — no credit card required.
      </p>
      <Link
        href="/"
        className="inline-block bg-[#4A3428] text-white font-medium px-6 py-3 rounded-lg hover:bg-[#3d2b20] transition-colors"
      >
        Start Free Trial →
      </Link>
    </section>
  );
}
