'use client';

import { useCallback, useMemo, useState } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Star } from 'lucide-react';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';
import MarketingPricingSection from '@/components/MarketingPricingSection';
import type { IndustryData } from '@/lib/industries';

function shortenToSentences(text: string, maxSentences = 2) {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const parts = trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!parts) return trimmed;
  return parts.slice(0, Math.max(1, maxSentences)).join('').trim();
}

function normalizeIndustryCopy(industry: IndustryData): IndustryData {
  return {
    ...industry,
    hero: {
      ...industry.hero,
      subheading: shortenToSentences(industry.hero.subheading, 2),
    },
    socialProof: {
      ...industry.socialProof,
      text: shortenToSentences(industry.socialProof.text, 2),
    },
    painPoints: {
      ...industry.painPoints,
      items: industry.painPoints.items.map((i) => ({
        ...i,
        body: shortenToSentences(i.body, 2),
      })),
    },
    howItWorks: {
      ...industry.howItWorks,
      steps: industry.howItWorks.steps.map((s) => ({
        ...s,
        body: shortenToSentences(s.body, 2),
      })),
    },
    benefits: {
      ...industry.benefits,
      items: industry.benefits.items.map((b) => ({
        ...b,
        body: shortenToSentences(b.body, 2),
      })),
    },
    faq: {
      ...industry.faq,
      items: industry.faq.items.map((f) => ({
        ...f,
        a: shortenToSentences(f.a, 2),
      })),
    },
    finalCta: {
      ...industry.finalCta,
      subheading: shortenToSentences(industry.finalCta.subheading, 2),
    },
  };
}

function buildFaqJsonLd(industry: IndustryData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: industry.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

function buildSoftwareApplicationJsonLd(industry: IndustryData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'ReviewFlo',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: industry.seo.canonicalUrl,
    description: industry.seo.description,
    offers: [
      {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        category: 'Free',
        url: industry.seo.canonicalUrl,
      },
    ],
  };
}

export default function IndustryLandingPage({ industry }: { industry: IndustryData }) {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const normalized = useMemo(() => normalizeIndustryCopy(industry), [industry]);
  const heroStatColsClass = useMemo(() => {
    const count = normalized.hero.stats.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2 md:grid-cols-2';
    if (count === 3) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-4';
  }, [normalized.hero.stats.length]);
  const heroStatMaxWidthClass = useMemo(() => {
    const count = normalized.hero.stats.length;
    if (count === 3) return 'max-w-3xl';
    if (count === 2) return 'max-w-2xl';
    return 'max-w-4xl';
  }, [normalized.hero.stats.length]);

  const url = normalized.seo.canonicalUrl;
  const title = normalized.seo.title;
  const description = normalized.seo.description;

  const faqJsonLd = useMemo(() => buildFaqJsonLd(normalized), [normalized]);
  const softwareJsonLd = useMemo(() => buildSoftwareApplicationJsonLd(normalized), [normalized]);

  const handleFaqToggle = useCallback((index: number) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={url} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content="https://reviewflo.com/images/reviewflo-og-image.png" />
        <meta property="og:site_name" content="ReviewFlo" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={url} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content="https://reviewflo.com/images/reviewflo-twitter-image.png" />
      </Head>

      <Script
        id={`industry-faq-jsonld-${industry.slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Script
        id={`industry-softwareapp-jsonld-${industry.slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <div className="min-h-screen bg-white">
        <SiteNav variant="marketing" />
        <div className={SITE_NAV_SPACER_CLASS} />

        {/* 1. Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 py-12 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="sr-only">
                {industry.targetKeyword}
              </p>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                {normalized.h1}
              </h1>
              <p className="text-base sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed">
                {normalized.hero.subheading}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-4">
                <Link
                  href={normalized.hero.cta.href}
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold text-base hover:bg-[#4A3428]/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {normalized.hero.cta.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-white text-[#4A3428] rounded-lg font-semibold text-base border-2 border-[#C9A961] hover:border-[#4A3428] hover:bg-[#E8DCC8]/20 transition-all duration-200"
                >
                  See How It Works ↓
                </Link>
              </div>

              <div className={`${heroStatMaxWidthClass} mx-auto mt-6 sm:mt-8`}>
                <div className={`grid ${heroStatColsClass} gap-3 sm:gap-4`}>
                  {normalized.hero.stats.map((s) => (
                    <div
                      key={`${s.value}-${s.label}`}
                      className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm"
                    >
                      <div className="text-xl sm:text-2xl font-bold text-gray-900">
                        {s.value}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 mt-1">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs sm:text-sm font-semibold text-[#4A3428]">
                  {normalized.hero.callout}
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* 2. Social proof bar */}
        <section className="border-y border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-center gap-2 text-sm sm:text-base text-gray-700">
              <span className="font-semibold">{normalized.socialProof.text}</span>
            </div>
          </div>
        </section>

        {/* 3. Pain points */}
        <section className="py-12 sm:py-20 bg-gray-50/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-3 text-center">
              {normalized.painPoints.sectionHeading}
            </h2>
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              {normalized.painPoints.items.map((item) => (
                <div
                  key={item.heading}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    {item.heading}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. How it works */}
        <section id="how-it-works" className="py-12 sm:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
              {normalized.howItWorks.sectionHeading}
            </h2>
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8 relative mt-8">
              <div className="hidden md:block absolute top-10 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-[#C9A961]/30 z-0" />
              {normalized.howItWorks.steps.map((step, idx) => (
                <div
                  key={step.title}
                  className="relative bg-white p-6 sm:p-8 rounded-xl shadow-md border border-[#C9A961]/20 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-[#C9A961]/50 z-10"
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center mb-5 text-white font-bold text-lg ${
                      idx === 2 ? 'bg-[#C9A961] text-[#4A3428]' : 'bg-[#4A3428]'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-8 sm:mt-12 text-center max-w-xl mx-auto">
              <Link
                href="/demo"
                className="font-semibold text-[#4A3428] underline decoration-[#C9A961]/70 underline-offset-2 hover:decoration-[#4A3428]"
              >
                Try the interactive demo
              </Link>
              .
            </p>
          </div>
        </section>

        {/* 5. Benefits */}
        <section className="py-12 sm:py-20 bg-gray-50/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-3 text-center">
              {normalized.benefits.sectionHeading}
            </h2>
            <div className="mt-8 grid md:grid-cols-2 gap-6">
              {normalized.benefits.items.map((b) => (
                <div
                  key={b.heading}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                    {b.heading}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {b.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. Testimonial */}
        {normalized.testimonial && (
          <section className="py-12 sm:py-16 bg-white">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="rounded-2xl overflow-hidden border border-[#C9A961]/30 bg-gradient-to-br from-[#E8DCC8]/40 to-[#C9A961]/10">
                <div className="p-6 sm:p-8">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#C9A961] text-[#C9A961]" />
                    ))}
                  </div>
                  <p className="text-gray-900 font-semibold text-lg sm:text-xl leading-relaxed">
                    “{normalized.testimonial.quote}”
                  </p>
                  <p className="mt-3 text-gray-600 text-sm">
                    {normalized.testimonial.attribution}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 7. Pricing (reuse existing) */}
        <MarketingPricingSection />

        {/* 8. FAQ */}
        <section id="faq" className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-10 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-2">
              {normalized.faq.items.map((item, i) => (
                <div
                  key={item.q}
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

        {/* 9. Related industries */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 text-center">
              Related industries
            </h2>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
              {normalized.relatedIndustries.items.map((rel) => (
                <Link
                  key={rel.href}
                  href={rel.href}
                  className="inline-flex items-center justify-center px-5 py-3 bg-white border border-[#C9A961]/40 rounded-xl text-sm font-semibold text-[#4A3428] hover:border-[#4A3428] hover:bg-[#E8DCC8]/20 transition-colors"
                >
                  {rel.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* 10. Final CTA */}
        <section className="py-12 sm:py-20 bg-gradient-to-br from-[#4A3428] to-[#3a2820]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-xl sm:text-3xl font-bold text-white mb-3">
              {normalized.finalCta.heading}
            </h2>
            <p className="text-[#E8DCC8]/80 text-sm sm:text-base mb-6 sm:mb-8">
              {normalized.finalCta.subheading}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href={normalized.finalCta.buttonHref}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-[#C9A961] text-[#4A3428] rounded-lg font-bold hover:bg-[#C9A961]/90 transition-all duration-200 shadow-lg"
              >
                {normalized.finalCta.buttonLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-transparent text-white rounded-lg font-semibold border-2 border-white/30 hover:border-white hover:bg-white/10 transition-all duration-200"
              >
                See Full Pricing
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}

