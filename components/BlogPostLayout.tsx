'use client';

import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
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
    <section className="mt-12 rounded-2xl overflow-hidden border border-[#C9A961]/30 bg-gradient-to-br from-[#E8DCC8]/40 to-[#C9A961]/10">
      <div className="p-6 sm:p-8">
        {/* Star row */}
        <div className="flex gap-0.5 mb-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-[#C9A961] text-[#C9A961]" />
          ))}
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
          Start getting more 5-star reviews — free
        </h2>
        <p className="text-gray-600 text-sm sm:text-base mb-5 max-w-lg">
          ReviewFlo routes unhappy customers to private feedback and happy ones straight to your Google page.
          Set it up once, then let it run.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Link
            href="/join"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4A3428] text-white font-semibold rounded-lg hover:bg-[#4A3428]/90 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
          >
            Start Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-xs text-gray-400">No credit card required · Free forever</span>
        </div>
      </div>
    </section>
  );
}
