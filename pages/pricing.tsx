'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, ChevronDown, ChevronRight, X } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import ComingSoonTierModal from '@/components/ComingSoonTierModal';
import { trackEvent } from '@/lib/posthog-provider';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

function useFadeInOnScroll() {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  return { ref, isVisible };
}

const FAQ_ITEMS = [
  {
    q: 'Is the Free tier really free forever?',
    a: 'Yes. No credit card required, no time limit, no catch. You get core review management features forever at no cost.',
  },
  {
    q: 'When do Pro and AI tiers launch?',
    a: "May 2026. We're building these features based on user feedback from our Free tier users.",
  },
  {
    q: "What's included in the 50% launch discount?",
    a: "Early signups (before May 2026) get 50% off Pro ($9.50/mo) or AI ($24.50/mo) for their first 3 months. After 3 months, regular pricing applies ($19/$49).",
  },
  {
    q: 'Can I upgrade or downgrade anytime?',
    a: 'Yes. No contracts. Switch between tiers or cancel anytime when paid tiers launch.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'Yes. 30-day money-back guarantee on paid tiers (Pro & AI) when they launch.',
  },
  {
    q: 'How does Free tier compare to paid tiers?',
    a: 'Free gives you core features: stop bad reviews, get Google reviews. Pro adds dashboard sending and automation. AI adds SMS automation and AI-powered features.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Credit card, debit card (via Stripe) for paid tiers when they launch. Free tier requires no payment.',
  },
  {
    q: 'Can I try Pro or AI before paying?',
    a: 'Start with Free tier now. When Pro/AI launch, you can upgrade and cancel within 30 days for full refund.',
  },
];

export default function PricingPage() {
  const pricingSection = useFadeInOnScroll();
  const comparisonSection = useFadeInOnScroll();
  const faqSection = useFadeInOnScroll();
  const ctaSection = useFadeInOnScroll();
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [comingSoonTier, setComingSoonTier] = useState<'pro' | 'ai' | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const hasTrackedPageView = useRef(false);
  const hasTrackedComparison = useRef(false);

  useEffect(() => {
    if (!hasTrackedPageView.current) {
      trackEvent('pricing_page_viewed');
      hasTrackedPageView.current = true;
    }
  }, []);

  useEffect(() => {
    const el = comparisonSection.ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedComparison.current) {
          trackEvent('competitor_comparison_viewed');
          hasTrackedComparison.current = true;
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [comparisonSection.ref]);

  const handleFaqToggle = useCallback((index: number) => {
    setOpenFaqIndex((prev) => {
      const next = prev === index ? null : index;
      if (next !== null) {
        trackEvent('faq_opened', { question_index: next, question: FAQ_ITEMS[next]?.q });
      }
      return next;
    });
  }, []);

  const handleCtaClick = useCallback((tier: 'free' | 'pro' | 'ai') => {
    trackEvent('pricing_cta_clicked', { tier });
  }, []);

  const handleComingSoonContinue = useCallback((notifyOnLaunch: boolean) => {
    setShowComingSoonModal(false);
    const tier = comingSoonTier;
    setComingSoonTier(null);
    if (typeof window !== 'undefined' && tier) {
      // /qualify has the full form with tier selection; preserve intent via URL
      const params = new URLSearchParams({ tier, notify: notifyOnLaunch ? '1' : '0' });
      window.location.href = `/qualify?${params.toString()}`;
    }
  }, [comingSoonTier]);

  return (
    <>
      <Head>
        <title>ReviewFlo Pricing - Simple, Transparent Pricing for Review Management</title>
        <meta name="description" content="ReviewFlo pricing: Free forever for Basic. Pro $19/mo, AI $49/mo launching May 2026. No contracts. 50% off for early signups. Compare to Podium, BirdEye, NiceJob." />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="min-h-screen bg-white">
        <SiteNav variant="pricing" />
        <div className={SITE_NAV_SPACER_CLASS} />

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              ReviewFlo Pricing
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-2">
              Simple, transparent pricing. No contracts. No surprises.
            </p>
            <p className="text-base text-gray-500">
              Start free forever. Upgrade when Pro & AI launch in May 2026.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section
          id="pricing"
          ref={pricingSection.ref}
          className={`py-12 sm:py-16 bg-gray-50 transition-all duration-700 ${
            pricingSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {/* Basic */}
              <div className="bg-white rounded-xl shadow-md border-2 border-[#C9A961]/30 p-6 sm:p-8 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">BASIC (FREE)</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-[#4A3428] text-white text-xs font-medium rounded">
                    Available Now
                  </span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">$0</span>
                  <span className="text-gray-600">/month</span>
                  <p className="text-gray-600 text-sm mt-1">Forever Free</p>
                </div>
                <p className="text-gray-600 text-sm mb-6">Perfect for getting started</p>
                <div className="mb-6 flex-1">
                  <p className="font-semibold text-gray-900 text-sm mb-3">What&apos;s included:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {['Stop bad reviews', 'Google Reviews only', 'Email notifications', 'Basic stats', 'Manual sending'].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#C9A961] flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/join"
                  onClick={() => handleCtaClick('free')}
                  className="block w-full text-center px-6 py-3 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 transition-all"
                >
                  Start Free Now
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 sm:p-8 flex flex-col relative">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">PRO</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                    Coming May 2026
                  </span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">$19</span>
                  <span className="text-gray-600">/month</span>
                  <p className="text-[#4A3428] text-sm font-medium mt-1">Launch: $9.50/mo*</p>
                </div>
                <p className="text-gray-600 text-sm mb-6">For busy operators</p>
                <div className="mb-6 flex-1">
                  <p className="font-semibold text-gray-900 text-sm mb-3">Everything in Basic, plus:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {['Send from dashboard', 'Auto follow-up emails', 'Multi-platform support', 'Remove branding', 'Customizable review request emails', 'Track your Google stats'].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#C9A961] flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setComingSoonTier('pro'); setShowComingSoonModal(true); handleCtaClick('pro'); }}
                  className="block w-full text-center px-6 py-3 bg-white text-[#4A3428] border-2 border-[#4A3428] rounded-lg font-semibold hover:bg-[#E8DCC8]/20 transition-all"
                >
                  Get Notified at Launch
                </button>
              </div>

              {/* AI */}
              <div className="bg-white rounded-xl shadow-lg border-2 border-[#C9A961] p-6 sm:p-8 flex flex-col relative">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#C9A961] text-[#4A3428] text-xs font-bold rounded-full">
                  Most Popular
                </span>
                <div className="mb-4 mt-2">
                  <h3 className="text-lg font-bold text-gray-900">AI</h3>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded">
                    Coming May 2026
                  </span>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">$49</span>
                  <span className="text-gray-600">/month</span>
                  <p className="text-[#4A3428] text-sm font-medium mt-1">Launch: $24.50/mo*</p>
                </div>
                <p className="text-gray-600 text-sm mb-6">Completely automated</p>
                <div className="mb-6 flex-1">
                  <p className="font-semibold text-gray-900 text-sm mb-3">Everything in Pro, plus:</p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {['SMS automation', 'CRM integration', 'AI review drafts', 'AI review responses', 'White-label option', 'Priority support'].map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-[#C9A961] flex-shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => { setComingSoonTier('ai'); setShowComingSoonModal(true); handleCtaClick('ai'); }}
                  className="block w-full text-center px-6 py-3 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 transition-all"
                >
                  Get Notified at Launch
                </button>
              </div>
            </div>

            <p className="text-center text-gray-500 text-sm mt-6">*50% off first 3 months for early signups</p>
          </div>
        </section>

        {/* Launch Discount Callout */}
        <section className="py-8 sm:py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-[#E8DCC8]/50 to-[#C9A961]/20 rounded-xl border-2 border-[#C9A961]/40 p-6 sm:p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Early Signup Bonus</h3>
              <p className="text-gray-700 mb-4">
                Sign up now (free) and lock in 50% off Pro or AI tier when they launch in May.
              </p>
              <p className="text-gray-700 mb-2">
                Free users who upgrade: <strong>$9.50</strong> or <strong>$24.50/mo</strong> for first 3 months (vs $19/$49 regular).
              </p>
            </div>
          </div>
        </section>

        {/* Competitor Comparison Table */}
        <section
          ref={comparisonSection.ref}
          className={`py-12 sm:py-16 bg-gray-50 transition-all duration-700 ${
            comparisonSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
              ReviewFlo vs The Competition
            </h2>
            <p className="text-lg text-gray-600 mb-10 text-center max-w-2xl mx-auto">
              All the features. 1/10th the price.
            </p>

            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[640px] bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-4 px-4 sm:px-6 font-semibold text-gray-900">Feature</th>
                    <th className="text-center py-4 px-4 sm:px-6 font-semibold text-[#4A3428] bg-[#E8DCC8]/30">ReviewFlo</th>
                    <th className="text-center py-4 px-4 sm:px-6 font-semibold text-gray-900">Podium</th>
                    <th className="text-center py-4 px-4 sm:px-6 font-semibold text-gray-900">BirdEye</th>
                    <th className="text-center py-4 px-4 sm:px-6 font-semibold text-gray-900">NiceJob</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(() => {
                    const CHECK = '__CHECK__';
                    const CROSS = '__CROSS__';
                    const rows: [string, string, string, string, string][] = [
                      ['Starting Price', 'FREE', '$289/mo', '$299/mo', '$75/mo'],
                      ['Pro Tier (May 2026)', '$19/mo', 'N/A', 'N/A', 'N/A'],
                      ['Contract Required', 'No', '12 mo', '12 mo', 'No'],
                      ['Negative Review Intercept', CHECK, CROSS, CROSS, CROSS],
                      ['Multi-Platform Reviews', CHECK, CHECK, CHECK, CHECK],
                      ['SMS Automation (May 2026)', CHECK, CHECK, CHECK, CHECK],
                      ['AI Features (May 2026)', CHECK, CROSS, CROSS, CROSS],
                      ['Email Support', CHECK, CHECK, CHECK, CHECK],
                      ['Free Tier', CHECK, CROSS, CROSS, CROSS],
                    ];
                    const renderCell = (val: string, isReviewFlo: boolean) => {
                      if (val === CHECK) return <CheckCircle className={`w-5 h-5 mx-auto ${isReviewFlo ? 'text-[#4A3428]' : 'text-green-500'}`} />;
                      if (val === CROSS) return <X className="w-5 h-5 mx-auto text-red-400" />;
                      return <span className={isReviewFlo ? 'font-semibold text-[#4A3428]' : ''}>{val}</span>;
                    };
                    return rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <td className="py-3.5 px-4 sm:px-6 text-gray-900 font-medium">{row[0]}</td>
                        <td className="py-3.5 px-4 sm:px-6 text-center bg-[#E8DCC8]/10">{renderCell(row[1], true)}</td>
                        <td className="py-3.5 px-4 sm:px-6 text-center text-gray-600">{renderCell(row[2], false)}</td>
                        <td className="py-3.5 px-4 sm:px-6 text-center text-gray-600">{renderCell(row[3], false)}</td>
                        <td className="py-3.5 px-4 sm:px-6 text-center text-gray-600">{renderCell(row[4], false)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            <p className="text-center text-[#4A3428] font-semibold mt-6">
              Save $3,468/year compared to Podium
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section
          ref={faqSection.ref}
          id="faq"
          className={`py-12 sm:py-16 transition-all duration-700 ${
            faqSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => handleFaqToggle(i)}
                    className="w-full flex items-center justify-between gap-4 py-4 px-5 text-left hover:bg-gray-50/50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">{item.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                        openFaqIndex === i ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaqIndex === i && (
                    <div className="px-5 pb-4 pt-0 text-gray-600 text-sm sm:text-base leading-relaxed border-t border-gray-100">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section
          ref={ctaSection.ref}
          className={`py-12 sm:py-16 bg-gray-50 transition-all duration-700 ${
            ctaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
              Start Free Today
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              No credit card required. Upgrade when ready.
            </p>
            <Link
              href="/join"
              onClick={() => handleCtaClick('free')}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold text-base hover:bg-[#4A3428]/90 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Start Free - Takes 2 Minutes
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </section>

        <SiteFooter />
      </div>

      {showComingSoonModal && comingSoonTier && (
        <ComingSoonTierModal
          open={showComingSoonModal}
          tier={comingSoonTier}
          onClose={() => { setShowComingSoonModal(false); setComingSoonTier(null); }}
          onContinueWithFree={handleComingSoonContinue}
        />
      )}
    </>
  );
}
