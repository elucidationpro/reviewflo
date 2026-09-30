'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/posthog-provider';
import { supabase } from '@/lib/supabase';

type WrapperTag = 'section' | 'div';

export default function MarketingPricingSection({
  as = 'section',
  id,
}: {
  as?: WrapperTag;
  id?: string;
}) {
  const Wrapper = as;
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  const proHref = isLoggedIn ? '/settings?section=plan' : '/join?plan=pro';

  return (
    <Wrapper id={id} className="py-12 sm:py-20 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">
            Simple Pricing
          </h2>
          <p className="text-gray-600 text-sm sm:text-lg">
            Start free. Upgrade to Pro anytime. AI coming soon.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {/* Free */}
          <div className="border-2 border-[#C9A961]/50 rounded-xl p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow">
            <span className="inline-block px-2.5 py-0.5 bg-[#4A3428] text-white text-xs font-semibold rounded-full mb-3">Available Now</span>
            <p className="text-xs font-semibold text-[#4A3428] uppercase tracking-widest mb-2">Free</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              $0<span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
            <p className="text-xs text-gray-500 mb-3">Forever</p>
            <p className="text-xs text-gray-600">Stop bad reviews · Google reviews</p>
          </div>

          {/* Pro */}
          <div className="border border-gray-200 rounded-xl p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow">
            <span className="inline-block px-2.5 py-0.5 bg-[#4A3428] text-white text-xs font-semibold rounded-full mb-3">Available Now</span>
            <p className="text-xs font-semibold text-[#4A3428] uppercase tracking-widest mb-2">Pro</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              $29<span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
            <p className="text-xs text-gray-500 mb-3">or $290/year</p>
            <p className="text-xs text-gray-600 mb-4">Dashboard sending · Auto follow-ups · Multi-platform</p>
            <Link
              href={proHref}
              onClick={() =>
                trackEvent('pricing_cta_clicked', { tier: 'pro', source: 'homepage_pricing_section' })
              }
              className="inline-flex w-full items-center justify-center rounded-lg border-2 border-[#4A3428] bg-white px-4 py-2.5 text-sm font-semibold text-[#4A3428] transition-colors hover:bg-[#E8DCC8]/30"
            >
              {isLoggedIn ? 'Upgrade to Pro' : 'Start with Pro'}
            </Link>
          </div>

          {/* AI */}
          <div className="border border-gray-200 rounded-xl p-6 text-center bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <span className="absolute top-0 right-0 px-2.5 py-1 bg-[#C9A961] text-[#4A3428] text-xs font-bold">Most Popular</span>
            <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs font-semibold rounded-full mb-3">Coming Soon</span>
            <p className="text-xs font-semibold text-[#4A3428] uppercase tracking-widest mb-2">AI</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              $49<span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
            <p className="text-xs text-gray-600 mb-4">SMS automation · AI drafts · CRM integration</p>
            <Link
              href="/join?plan=ai"
              onClick={() =>
                trackEvent('pricing_cta_clicked', { tier: 'ai', source: 'homepage_pricing_section' })
              }
              className="inline-flex w-full items-center justify-center rounded-lg border-2 border-[#4A3428] bg-white px-4 py-2.5 text-sm font-semibold text-[#4A3428] transition-colors hover:bg-[#E8DCC8]/30"
            >
              Coming soon
            </Link>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm sm:text-base font-semibold text-[#4A3428] border border-[#C9A961] rounded-lg hover:border-[#4A3428] hover:bg-[#E8DCC8]/30 transition-colors"
          >
            See Full Pricing
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </Wrapper>
  );
}

