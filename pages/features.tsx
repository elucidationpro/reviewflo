'use client';

import { ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav';
import SiteFooter from '@/components/SiteFooter';

type TierBadge = 'core' | 'pro' | 'ai';

interface FeatureSection {
  id: string;
  badges: TierBadge[];
  headline: string;
  description: string;
  whoFor: string;
  complianceNote?: string;
  cta?: { label: string; href: string };
  imageLabel: string;
}

const FEATURE_SECTIONS: FeatureSection[] = [
  {
    id: 'review-requests',
    badges: ['core'],
    headline: 'Turn every job into a Google review',
    description:
      'After each job, send your customer a single ReviewFlo link by text or email. They tap once, rate their experience, and land directly on your Google review page. No app to download, no account to create, no friction. The average business sees their first review within 24 hours of setting up ReviewFlo.',
    whoFor:
      'Any service business that wants more Google reviews without changing how they work.',
    cta: { label: 'Start Free', href: '/join' },
    imageLabel: 'Review Requests',
  },
  {
    id: 'smart-routing',
    badges: ['core'],
    headline: 'Hear from unhappy customers before Google does',
    description:
      'When a customer rates 1–4 stars, ReviewFlo routes them to a short private feedback form instead of straight to Google — and sends you an instant alert so you can reach out and make it right. The Google review link is always visible to every customer, so nothing is hidden. You just get a chance to fix problems first.',
    whoFor:
      'Businesses in competitive local markets where one bad review can cost real jobs.',
    complianceNote:
      "ReviewFlo's routing is fully compliant with Google's review policies and the FTC Consumer Review Fairness Act. Every customer can leave a public review.",
    cta: { label: 'Start Free', href: '/join' },
    imageLabel: 'Smart Routing',
  },
  {
    id: 'automated-follow-ups',
    badges: ['pro'],
    headline: 'Most customers mean to leave a review. Life gets in the way.',
    description:
      "ReviewFlo sends an automatic reminder a few days after the initial request if the customer hasn't responded yet. You set it up once and it runs in the background — no more chasing people down or hoping they remember.",
    whoFor:
      "Busy operators who don't have time to manually follow up with every customer.",
    cta: { label: 'See Pricing', href: '/pricing' },
    imageLabel: 'Automated Follow-Ups',
  },
  {
    id: 'gbp-integration',
    badges: ['pro'],
    headline: 'Your Google stats, without leaving ReviewFlo',
    description:
      'Connect your Google Business Profile and see your star rating, total review count, and reply rate right in your dashboard. Track how your reputation is trending over time and get alerted when new reviews come in so you can respond quickly.',
    whoFor:
      'Businesses actively managing their Google presence and reputation.',
    cta: { label: 'See Pricing', href: '/pricing' },
    imageLabel: 'Google Business Profile Integration',
  },
  {
    id: 'reply-to-reviews',
    badges: ['pro'],
    headline: 'Respond to every review without switching tabs',
    description:
      'Read and reply to your Google reviews directly from your ReviewFlo dashboard. Responding to reviews — even negative ones — significantly improves your local search ranking and shows potential customers you care. AI tier users get a pre-drafted reply to edit and post in one click.',
    whoFor:
      "Business owners who know they should respond to reviews but don't have time to do it consistently.",
    cta: { label: 'See Pricing', href: '/pricing' },
    imageLabel: 'Reply to Reviews',
  },
  {
    id: 'multi-location',
    badges: ['pro', 'ai'],
    headline: 'One account. Every location.',
    description:
      'Manage multiple business locations from a single ReviewFlo account. Each location gets its own review link, outreach queue, and dashboard — so you can see how each location is performing and send requests for the right business every time. Pro supports up to 3 locations. AI tier supports up to 15.',
    whoFor:
      'Businesses with multiple locations — med spas, salons, franchises, or any owner running more than one site.',
    cta: { label: 'See Pricing', href: '/pricing' },
    imageLabel: 'Multi-Location Support',
  },
  {
    id: 'past-customer-campaigns',
    badges: ['pro', 'ai'],
    headline: 'Years of happy customers. One upload.',
    description:
      "Upload your customer list and ReviewFlo works through it over the following weeks, sending personalized review request emails automatically at a steady pace. Pro includes up to 500 contacts per campaign; AI has no fixed list-size cap (fair use). Each contact can get up to 2 follow-up reminders if they don't respond. Set it up once and let it build your reputation in the background. Most businesses have years of satisfied customers who never left a review, and this turns that history into social proof.",
    whoFor:
      'Established businesses that want to build review volume fast without waiting for new customers.',
    complianceNote:
      "All campaign sends are paced to comply with Google's review request guidelines. Every email includes an unsubscribe link.",
    cta: { label: 'See Pricing', href: '/pricing' },
    imageLabel: 'Past Customer Campaigns',
  },
  {
    id: 'sms-outreach',
    badges: ['ai'],
    headline: 'Text messages get read. Emails get buried.',
    description:
      "Send review requests via SMS for dramatically higher open and response rates. ReviewFlo handles the delivery, pacing, and follow-ups automatically — all within Google's guidelines. Requires customer phone number.",
    whoFor:
      'Businesses whose customers are more likely to respond to a text than an email — trades, auto services, mobile businesses.',
    cta: { label: 'See Pricing', href: '/pricing' },
    imageLabel: 'SMS Outreach',
  },
  {
    id: 'ai-review-replies',
    badges: ['ai'],
    headline: 'Every review deserves a response. AI does the drafting.',
    description:
      'For every new Google review, ReviewFlo drafts a reply in your voice — personalized to what the reviewer said. You review it, edit if needed, and post with one click. Responding to reviews is one of the highest-ROI things a local business can do for their Google ranking. Now you can do it without it taking 20 minutes.',
    whoFor:
      "Busy owners who want to respond to every review but don't have the time to write them all from scratch.",
    cta: { label: 'See Pricing', href: '/pricing' },
    imageLabel: 'AI Review Replies',
  },
];

const TIER_BADGE_LABEL: Record<TierBadge, string> = {
  core: 'Core feature',
  pro: 'Pro tier',
  ai: 'AI tier',
};

const TIER_BADGE_CLASS: Record<TierBadge, string> = {
  core: 'bg-[#4A3428] text-white',
  pro: 'bg-[#6B7280] text-white',
  ai: 'bg-[#C9A961] text-[#4A3428]',
};

function TierBadgeRow({ badges }: { badges: TierBadge[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {badges.map((tier) => (
        <span
          key={tier}
          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${TIER_BADGE_CLASS[tier]}`}
        >
          {TIER_BADGE_LABEL[tier]}
        </span>
      ))}
    </div>
  );
}

function PlaceholderImage({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={`${label} screenshot placeholder`}
      className="relative w-full aspect-video rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 shadow-sm overflow-hidden"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(74,52,40,0.06) 1px, transparent 0)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <span className="text-xs sm:text-sm font-medium text-gray-500 text-center">
          {label}
        </span>
      </div>
    </div>
  );
}

interface SectionLayoutProps {
  reverse: boolean;
  image: ReactNode;
  children: ReactNode;
  id: string;
}

function SectionLayout({ reverse, image, children, id }: SectionLayoutProps) {
  return (
    <section
      id={id}
      className={`py-10 sm:py-14 ${
        reverse ? 'bg-gray-50/50' : 'bg-white'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex flex-col-reverse ${
            reverse ? 'md:flex-row-reverse' : 'md:flex-row'
          } items-center gap-8 md:gap-12`}
        >
          <div className="w-full md:w-1/2">{image}</div>
          <div className="w-full md:w-1/2">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function FeaturesPage() {
  return (
    <>
      <Head>
        <title>ReviewFlo Features — Review Management, Outreach & Automation</title>
        <meta
          name="description"
          content="Explore all ReviewFlo features: automated review requests, smart routing, past customer campaigns, multi-location support, AI reply drafts, and more. Built for local service businesses."
        />
        <meta name="author" content="ReviewFlo" />

        <link rel="canonical" href="https://usereviewflo.com/features" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://usereviewflo.com/features" />
        <meta
          property="og:title"
          content="ReviewFlo Features — Review Management, Outreach & Automation"
        />
        <meta
          property="og:description"
          content="Explore all ReviewFlo features: automated review requests, smart routing, past customer campaigns, multi-location support, AI reply drafts, and more. Built for local service businesses."
        />
        <meta property="og:site_name" content="ReviewFlo" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="ReviewFlo Features — Review Management, Outreach & Automation"
        />
        <meta
          name="twitter:description"
          content="Explore all ReviewFlo features: automated review requests, smart routing, past customer campaigns, multi-location support, AI reply drafts, and more. Built for local service businesses."
        />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="min-h-screen bg-white">
        <SiteNav variant="marketing" />
        <div className={SITE_NAV_SPACER_CLASS}></div>

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              Every tool you need to grow your reputation
            </h1>
            <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              ReviewFlo brings together review collection, reputation management,
              and customer outreach in one simple platform — built for
              owner-operated service businesses.
            </p>
          </div>
        </section>

        {/* Feature sections (alternating) */}
        {FEATURE_SECTIONS.map((feature, index) => {
          const reverse = index % 2 === 1;
          return (
            <SectionLayout
              key={feature.id}
              id={feature.id}
              reverse={reverse}
              image={<PlaceholderImage label={feature.imageLabel} />}
            >
              <TierBadgeRow badges={feature.badges} />
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 leading-tight">
                {feature.headline}
              </h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
                {feature.description}
              </p>
              <p className="text-sm italic text-gray-500 mb-4">
                <span className="font-medium not-italic text-gray-700">
                  Who it&rsquo;s for:
                </span>{' '}
                {feature.whoFor}
              </p>
              {feature.cta && (
                <Link
                  href={feature.cta.href}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4A3428] underline decoration-[#C9A961]/70 underline-offset-4 hover:decoration-[#4A3428]"
                >
                  {feature.cta.label}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
              {feature.complianceNote && (
                <p className="mt-4 text-xs text-gray-400 leading-relaxed">
                  {feature.complianceNote}
                </p>
              )}
            </SectionLayout>
          );
        })}

        {/* Closing CTA */}
        <section className="py-12 sm:py-20 bg-[#4A3428]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3">
              Start free. Upgrade when you&rsquo;re ready.
            </h2>
            <p className="text-[#E8DCC8]/80 text-sm sm:text-base mb-6 sm:mb-8">
              No contracts. No credit card required. Your first review could come
              in today.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link
                href="/join"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-[#C9A961] text-[#4A3428] rounded-lg font-bold hover:bg-[#C9A961]/90 transition-all duration-200 shadow-lg"
                style={{ touchAction: 'manipulation' }}
              >
                Start Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 bg-transparent text-white rounded-lg font-semibold border-2 border-white/30 hover:border-white hover:bg-white/10 transition-all duration-200"
                style={{ touchAction: 'manipulation' }}
              >
                See Pricing
              </Link>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
