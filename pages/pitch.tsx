import { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import {
  Star,
  TrendingDown,
  UserX,
  AlertTriangle,
  Clock,
  Wrench,
  Car,
  Heart,
  Building2,
  Briefcase,
  Phone,
  Mail,
  Globe,
  ShieldCheck,
  ArrowDown,
  CheckCircle,
  Sparkles,
  Zap,
  Repeat,
  Calendar,
  Award,
  Cpu,
  type LucideIcon,
} from 'lucide-react';

type SectionMeta = {
  id: string;
  label: string;
};

const SECTIONS: readonly SectionMeta[] = [
  { id: 'cover', label: '01 — Cover' },
  { id: 'problem', label: '02 — The Problem' },
  { id: 'numbers', label: '03 — By the Numbers' },
  { id: 'results', label: '04 — Real Results' },
  { id: 'how', label: '05 — How It Works' },
  { id: 'services', label: '06 — Services' },
  { id: 'who', label: '07 — Who We Work With' },
  { id: 'guarantee', label: '08 — Guarantee' },
  { id: 'contact', label: '09 — Contact' },
] as const;

// ============================================================================
// Section content (typed data so markup stays declarative)
// ============================================================================

const COVER_STATS: ReadonlyArray<{ value: string; label: string; Icon: LucideIcon }> = [
  { value: '53', label: 'Google reviews generated for one client in 35 days', Icon: Star },
  { value: '~44%', label: 'Average review conversion rate', Icon: TrendingDown },
  { value: '35', label: 'Days from setup to results', Icon: Calendar },
];

const PROBLEM_CARDS: ReadonlyArray<{ title: string; body: string; Icon: LucideIcon }> = [
  {
    title: 'Review count drives local ranking',
    body: "Google's local algorithm weighs volume and recency of reviews heavily. A competitor with 80 reviews outranks you with 12 — regardless of quality.",
    Icon: TrendingDown,
  },
  {
    title: "Happy customers don't follow through",
    body: 'They mean to leave a review. They don\u2019t. Without a frictionless, timely ask right after the job — it never happens. Most businesses never ask at all.',
    Icon: UserX,
  },
  {
    title: 'One bad review does real damage',
    body: 'Unhappy customers leave reviews 3x more often than happy ones. Without a system to intercept them privately, they go straight to Google.',
    Icon: AlertTriangle,
  },
  {
    title: "You don't have time to manage it",
    body: "You're running a business. Chasing reviews, responding to them, tracking your reputation — it never gets done. That's where we come in.",
    Icon: Clock,
  },
];

const REVIEW_STATS: ReadonlyArray<{
  value: string;
  body: string;
  source: string;
}> = [
  {
    value: '18%',
    body: 'Businesses that respond to all reviews earn up to 18% more revenue.',
    source: 'WiserReview, 2026',
  },
  {
    value: '5\u20139%',
    body: 'A single 1-star rating increase boosts revenue by 5\u20139%. Every 10 new reviews improves conversion rate by 2.8%.',
    source: 'Spokk, 2025',
  },
  {
    value: '73%',
    body: '73% of consumers only trust reviews written in the last 30 days. Old reviews are nearly worthless.',
    source: 'WiserReview, 2026',
  },
  {
    value: '94%',
    body: '94% of consumers have avoided a business because of its negative reviews. Just 4 bad reviews can cost a business 70% of potential clients.',
    source: 'Bridge Media, 2025',
  },
  {
    value: '25% higher',
    body: 'Listings with at least one new review per week rank 25% higher in local search.',
    source: 'Content by Cass / Birdeye, 2026',
  },
  {
    value: '2x revenue',
    body: 'Businesses with 200+ reviews generate twice the revenue of those with fewer.',
    source: 'Trustmary, 2025',
  },
];

const REVIEW_STAT_SOURCES: ReadonlyArray<string> = [
  'WiserReview \u2014 53 Google Review Statistics (2026). wiserreview.com',
  'Spokk \u2014 ROI of Google Reviews (2025). spokk.io',
  'Bridge Media \u2014 The Importance of Google Reviews (2025). bridgemedia.ca',
  'Content by Cass / Birdeye \u2014 75 Google Business Profile Stats (2026). contentbycass.com',
  'Trustmary \u2014 Online Reviews Statistics (2025). trustmary.com',
];

type LocationCard = {
  name: string;
  number: string;
  sublabel: string;
  metrics: ReadonlyArray<{ label: string; value: string }>;
};

const LOCATION_CARDS: ReadonlyArray<LocationCard> = [
  {
    name: 'Location 1 — Jefferson City',
    number: '31',
    sublabel: 'Google review conversions',
    metrics: [
      { label: 'Customers contacted', value: '53' },
      { label: 'Sent to Google', value: '38' },
      { label: 'Conversion rate', value: '~44%' },
      { label: 'Days active', value: '35' },
    ],
  },
  {
    name: 'Location 2 — Lake Ozark',
    number: '22',
    sublabel: 'Google review conversions',
    metrics: [
      { label: 'Customers contacted', value: '78' },
      { label: 'Sent to Google', value: '34' },
      { label: 'Conversion rate', value: '~44%' },
      { label: 'Days active', value: '34' },
    ],
  },
];

const FUNNEL_ROWS: ReadonlyArray<{
  label: string;
  count: string;
  percentLabel: string;
  width: number;
}> = [
  { label: 'Customers Reached', count: '131', percentLabel: '100%', width: 100 },
  { label: 'Responded to Flow', count: '~104', percentLabel: '~79%', width: 79 },
  { label: 'Directed to Google', count: '72', percentLabel: '55%', width: 55 },
  { label: 'Confirmed Google Reviews', count: '53', percentLabel: '~44%', width: 44 },
];

const HOW_STEPS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'We build your system',
    body: 'We connect ReviewFlo to your workflow. Automated review requests go out after every completed job — via text or email, on your timeline.',
  },
  {
    title: 'Happy vs. unhappy routing',
    body: 'Happy customers are directed to Google. Unhappy ones go to a private feedback form. You capture the insight without the public damage.',
  },
  {
    title: 'Reviews come in. We manage the rest.',
    body: 'We respond to reviews, run campaigns to existing customers, and handle anything that comes up. You watch the number go up.',
  },
];

type ServiceBadgeTone = 'recurring' | 'onetime' | 'ondemand' | 'anchor' | 'saas';

const BADGE_STYLES: Record<ServiceBadgeTone, string> = {
  recurring: 'bg-[#C9A961]/15 text-[#4A3428] border-[#C9A961]/50',
  onetime: 'bg-white text-[#4A3428] border-[#C9A961]',
  ondemand: 'bg-[#4A3428]/10 text-[#4A3428] border-[#4A3428]/30',
  anchor: 'bg-[#4A3428] text-[#E8DCC8] border-[#4A3428]',
  saas: 'bg-gray-100 text-gray-500 border-gray-200',
};

const SERVICES: ReadonlyArray<{
  name: string;
  description: string;
  pricing: string;
  badge: string;
  tone: ServiceBadgeTone;
  Icon: LucideIcon;
}> = [
  {
    name: 'Review Capture Automation',
    description: 'Post-job SMS/email triggers. Set up once, runs forever.',
    pricing: 'Setup + retainer',
    badge: 'Recurring',
    tone: 'recurring',
    Icon: Zap,
  },
  {
    name: 'Review Campaign Blitz',
    description: 'Reach your existing customer list. 20\u201350 reviews in 2 weeks.',
    pricing: 'Flat fee',
    badge: 'One-time',
    tone: 'onetime',
    Icon: Sparkles,
  },
  {
    name: 'Review Response Management',
    description: 'We respond to every review. Professional, on-brand, timely.',
    pricing: 'Monthly retainer',
    badge: 'Recurring',
    tone: 'recurring',
    Icon: Repeat,
  },
  {
    name: 'Negative Review Recovery',
    description: 'Strategic response + positive review push to dilute damage.',
    pricing: 'Per incident',
    badge: 'On-demand',
    tone: 'ondemand',
    Icon: AlertTriangle,
  },
  {
    name: 'Full Reputation System Build',
    description: 'Everything bundled. Best for businesses that want it all handled.',
    pricing: 'Setup + monthly',
    badge: 'Anchor offer',
    tone: 'anchor',
    Icon: Award,
  },
  {
    name: 'ReviewFlo Self-Serve',
    description: 'Run your own system. Free to start at usereviewflo.com.',
    pricing: 'Free to paid',
    badge: 'SaaS',
    tone: 'saas',
    Icon: Cpu,
  },
];

const AUDIENCE_CARDS: ReadonlyArray<{ title: string; body: string; Icon: LucideIcon }> = [
  {
    title: 'Home Services',
    body: 'Trades, plumbing, HVAC, cleaning, landscaping, pest control, window cleaning. Any business that runs on local reputation and word of mouth.',
    Icon: Wrench,
  },
  {
    title: 'Auto & Detailing',
    body: 'Car wash, detailing, auto glass, body shops, mobile detailing. High repeat-customer businesses where a strong review profile compounds over time.',
    Icon: Car,
  },
  {
    title: 'Health & Wellness',
    body: 'Med spas, dental, chiro, physical therapy. High-trust services where patients and clients check reviews before they ever pick up the phone.',
    Icon: Heart,
  },
  {
    title: 'Multi-Location',
    body: 'Regional chains, franchises, and service businesses scaling to new markets. We manage reputation across every location from one system \u2014 consistent volume, consistent quality.',
    Icon: Building2,
  },
  {
    title: 'Agencies',
    body: "If you're a marketing agency, we handle the review management piece for your clients so you don't have to build it. You focus on the relationship. We handle the execution.",
    Icon: Briefcase,
  },
];

// ============================================================================
// Small building blocks
// ============================================================================

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="font-mono text-xs sm:text-sm tracking-wider text-gray-400 uppercase">
      {children}
    </div>
  );
}

function GoldStars({ size = 'w-5 h-5' }: { size?: string }) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} className={`${size} fill-[#C9A961] text-[#C9A961]`} />
      ))}
    </div>
  );
}

function Logo({ className = 'h-12 sm:h-16 md:h-20 w-auto' }: { className?: string }) {
  return (
    <span className="inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/reviewflo-logo.svg"
        alt="ReviewFlo"
        className={className}
      />
    </span>
  );
}

// ============================================================================
// Dot navigation
// ============================================================================

function DotNav({
  sections,
  activeId,
  onSelect,
}: {
  sections: readonly SectionMeta[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Pitch deck sections"
      className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-50 flex-col gap-3"
    >
      {sections.map((s) => {
        const isActive = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-label={`Go to section: ${s.label}`}
            aria-current={isActive ? 'true' : undefined}
            className="group flex items-center gap-2 p-1"
          >
            <span
              className={`block rounded-full transition-all duration-200 ${
                isActive
                  ? 'w-3 h-3 bg-[#4A3428] ring-2 ring-[#C9A961]/50 ring-offset-2 ring-offset-white'
                  : 'w-2.5 h-2.5 bg-transparent border border-gray-400 group-hover:border-[#4A3428] group-hover:bg-[#C9A961]/40'
              }`}
            />
          </button>
        );
      })}
    </nav>
  );
}

// ============================================================================
// Section container (registers its DOM node with the page's observer)
// ============================================================================

function SectionRef({
  id,
  label,
  register,
  children,
  className,
}: {
  id: string;
  label: string;
  register: (id: string, el: HTMLElement | null) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const cb = useCallback(
    (el: HTMLElement | null) => register(id, el),
    [id, register]
  );
  return (
    <section
      id={id}
      data-section-id={id}
      ref={cb}
      className={`min-h-screen w-full scroll-mt-6 flex flex-col justify-center py-16 sm:py-24 ${className ?? ''}`}
    >
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <SectionLabel>{label}</SectionLabel>
        <div className="mt-6 sm:mt-8">{children}</div>
      </div>
    </section>
  );
}

// ============================================================================
// Page
// ============================================================================

export default function PitchPage() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const visibilityRatios = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.sectionId;
          if (!id) continue;
          visibilityRatios.set(
            id,
            entry.isIntersecting ? entry.intersectionRatio : 0
          );
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        visibilityRatios.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });
        if (bestId) setActiveId(bestId);
      },
      {
        rootMargin: '-35% 0px -35% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    SECTIONS.forEach((s) => {
      const el = sectionRefs.current.get(s.id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      sectionRefs.current.set(id, el);
    } else {
      sectionRefs.current.delete(id);
    }
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <>
      <Head>
        <title>ReviewFlo — Sales Deck</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta
          name="description"
          content="ReviewFlo sales deck: how we generate Google reviews for local service businesses."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }
        }
      `}</style>

      <DotNav sections={SECTIONS} activeId={activeId} onSelect={scrollTo} />

      <main className="min-h-screen w-full bg-white text-gray-900 overflow-x-hidden">
        {/* ===================================================================
            Section 1 — Cover
            =================================================================== */}
        <SectionRef
          id="cover"
          label="01 — Cover"
          register={registerRef}
          className="relative bg-gradient-to-br from-[#E8DCC8]/40 via-white to-[#E8DCC8]/40"
        >
          <div className="max-w-4xl">
            <div className="flex items-center gap-4">
              <Logo />
            </div>
            <div className="mt-3 text-xs sm:text-sm text-gray-500 font-mono tracking-wide uppercase">
              powered by Elucidation Media
            </div>

            <div className="mt-8">
              <GoldStars />
            </div>

            <h1 className="mt-5 text-3xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Your best customers aren&apos;t leaving reviews.{' '}
              <span className="text-[#4A3428]">We fix that.</span>
            </h1>
            <p className="mt-5 text-base sm:text-xl text-gray-600 max-w-3xl leading-relaxed">
              Done-for-you review management for local service businesses —
              automated systems, real campaigns, and everything in between.
              Built for businesses that do great work and want proof.
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-[#C9A961]/30">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              {COVER_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/70 backdrop-blur-sm border border-[#C9A961]/20 rounded-xl p-5 sm:p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#E8DCC8] flex items-center justify-center">
                      <stat.Icon className="w-4 h-4 text-[#4A3428]" />
                    </div>
                    <div className="text-4xl sm:text-5xl font-bold text-[#4A3428] tracking-tight">
                      {stat.value}
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex items-center gap-2 text-xs text-gray-400">
            <ArrowDown className="w-4 h-4 animate-bounce" />
            <span>Scroll to continue</span>
          </div>
        </SectionRef>

        {/* ===================================================================
            Section 2 — The Problem
            =================================================================== */}
        <SectionRef
          id="problem"
          label="02 — The Problem"
          register={registerRef}
        >
          <div className="max-w-4xl">
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Good businesses lose customers to worse ones with{' '}
              <span className="text-[#4A3428]">more reviews.</span>
            </h2>
            <p className="mt-5 text-base sm:text-xl text-gray-600 leading-relaxed">
              It&apos;s not about the quality of your work. It&apos;s about
              what shows up when someone Googles you. And right now —
              it&apos;s probably not enough.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {PROBLEM_CARDS.map((card) => (
              <div
                key={card.title}
                className="bg-white p-6 sm:p-7 rounded-xl border border-[#C9A961]/20 shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:border-[#C9A961]/50 transition-all duration-300"
              >
                <div className="w-11 h-11 rounded-xl bg-[#E8DCC8] flex items-center justify-center mb-4">
                  <card.Icon className="w-5 h-5 text-[#4A3428]" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </SectionRef>

        {/* ===================================================================
            Section 3 — By the Numbers
            =================================================================== */}
        <SectionRef
          id="numbers"
          label="03 — By the Numbers"
          register={registerRef}
          className="bg-gray-50/70"
        >
          <div className="max-w-4xl">
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
              The data is{' '}
              <span className="text-[#4A3428]">hard to ignore.</span>
            </h2>
            <p className="mt-5 text-base sm:text-xl text-gray-600 leading-relaxed">
              This isn&apos;t soft brand advice. Reviews have a direct,
              measurable impact on revenue, rankings, and conversions for
              every local service business.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {REVIEW_STATS.map((stat) => (
              <div
                key={stat.source + stat.value}
                className="bg-white p-6 sm:p-7 rounded-xl border border-[#C9A961]/20 shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:border-[#C9A961]/50 transition-all duration-300 flex flex-col"
              >
                <div className="text-4xl sm:text-5xl font-bold text-[#4A3428] tracking-tight leading-none">
                  {stat.value}
                </div>
                <p className="mt-4 text-sm sm:text-base text-gray-700 leading-relaxed flex-1">
                  {stat.body}
                </p>
                <div className="mt-4 pt-3 border-t border-[#C9A961]/20 text-[11px] sm:text-xs text-gray-400 font-mono tracking-wide">
                  Source: {stat.source}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 max-w-4xl">
            <div className="text-[11px] font-mono uppercase tracking-widest text-gray-400">
              Sources
            </div>
            <ul className="mt-2 space-y-1 text-[11px] sm:text-xs text-gray-400 leading-relaxed">
              {REVIEW_STAT_SOURCES.map((src) => (
                <li key={src}>{src}</li>
              ))}
            </ul>
          </div>
        </SectionRef>

        {/* ===================================================================
            Section 4 — Real Results
            =================================================================== */}
        <SectionRef
          id="results"
          label="04 — Real Results"
          register={registerRef}
          className="bg-gradient-to-br from-[#E8DCC8]/20 via-white to-white"
        >
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8DCC8] text-[#4A3428] text-xs font-bold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A3428] animate-pulse" />
              Live client data — confidential
            </div>
            <h2 className="mt-5 text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
              <span className="text-[#4A3428]">53</span> new Google reviews
              in 35 days.
            </h2>
            <p className="mt-4 text-base sm:text-xl text-gray-600 leading-relaxed">
              Two locations of a regional med spa. Both onboarded March 20,
              2026. Here&apos;s what the data shows.
            </p>
            <div className="mt-5">
              <GoldStars size="w-4 h-4" />
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            {LOCATION_CARDS.map((loc) => (
              <div
                key={loc.name}
                className="bg-white p-6 sm:p-8 rounded-xl border border-[#C9A961]/20 shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                    {loc.name}
                  </div>
                  <Star className="w-4 h-4 fill-[#C9A961] text-[#C9A961]" />
                </div>
                <div className="mt-5 flex items-baseline gap-3">
                  <div className="text-6xl sm:text-7xl font-bold text-[#4A3428] tracking-tight">
                    {loc.number}
                  </div>
                  <div className="text-sm text-gray-600">{loc.sublabel}</div>
                </div>
                <dl className="mt-6 divide-y divide-gray-200">
                  {loc.metrics.map((m) => (
                    <div
                      key={m.label}
                      className="flex justify-between items-center py-3"
                    >
                      <dt className="text-sm text-gray-600">{m.label}</dt>
                      <dd className="text-sm font-semibold text-gray-900 tabular-nums">
                        {m.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-white p-6 sm:p-8 rounded-xl border border-[#C9A961]/20 shadow-md">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                Combined funnel — both locations
              </div>
              <div className="text-xs text-gray-500">
                131 reached <span className="text-gray-300 mx-1">→</span>{' '}
                <span className="font-semibold text-[#4A3428]">
                  53 reviews
                </span>
              </div>
            </div>
            <div className="mt-6 space-y-5">
              {FUNNEL_ROWS.map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between items-baseline mb-1.5 gap-4">
                    <div className="text-sm font-medium text-gray-900">
                      {row.label}
                    </div>
                    <div className="text-sm text-gray-600 tabular-nums whitespace-nowrap">
                      {row.count}{' '}
                      <span className="text-gray-400">
                        — {row.percentLabel}
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-[#E8DCC8]/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C9A961] to-[#4A3428] rounded-full transition-all duration-500"
                      style={{ width: `${row.width}%` }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionRef>

        {/* ===================================================================
            Section 5 — How It Works
            =================================================================== */}
        <SectionRef id="how" label="05 — How It Works" register={registerRef}>
          <div className="max-w-4xl">
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Set once. <span className="text-[#4A3428]">Runs forever.</span>
            </h2>
            <p className="mt-5 text-base sm:text-xl text-gray-600 leading-relaxed">
              No training. No ongoing work on your end. We build and manage
              the whole system — you just keep doing your job.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 relative">
            {/* Desktop connector — matches homepage How It Works */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-14 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-px bg-[#C9A961]/30 z-0"
            />

            {HOW_STEPS.map((step, idx) => (
              <div
                key={step.title}
                className="relative z-10 bg-white p-6 sm:p-8 rounded-xl border border-[#C9A961]/20 shadow-md hover:shadow-lg hover:-translate-y-1 hover:border-[#C9A961]/50 transition-all duration-300"
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center mb-5 font-bold text-lg ${
                    idx === HOW_STEPS.length - 1
                      ? 'bg-[#C9A961] text-[#4A3428]'
                      : 'bg-[#4A3428] text-white'
                  }`}
                >
                  {idx + 1}
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 sm:p-7 rounded-xl border border-[#C9A961]/40 bg-[#E8DCC8]/30 flex gap-4 items-start">
            <div className="shrink-0 w-9 h-9 rounded-full bg-[#4A3428] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#C9A961]" />
            </div>
            <p className="text-sm sm:text-base text-[#4A3428] leading-relaxed">
              Most businesses lose reviews because the ask happens too late,
              in the wrong format, or not at all. ReviewFlo sends the right
              message at the right moment — automatically, every time.
            </p>
          </div>
        </SectionRef>

        {/* ===================================================================
            Section 6 — Services
            =================================================================== */}
        <SectionRef
          id="services"
          label="06 — Services"
          register={registerRef}
          className="bg-gray-50/70"
        >
          <div className="max-w-4xl">
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Everything your{' '}
              <span className="text-[#4A3428]">reputation</span> needs.
            </h2>
            <p className="mt-5 text-base sm:text-xl text-gray-600 leading-relaxed">
              You choose how involved you want to be. From fully automated
              self-serve to completely done-for-you — or anything in between.
            </p>
          </div>

          <div className="mt-10 bg-white rounded-xl border border-[#C9A961]/20 shadow-md overflow-hidden">
            <div className="divide-y divide-gray-200">
              {SERVICES.map((svc) => (
                <div
                  key={svc.name}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-start md:items-center p-5 sm:p-6 hover:bg-[#E8DCC8]/10 transition-colors"
                >
                  <div className="md:col-span-6 flex items-start gap-4">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-[#E8DCC8] flex items-center justify-center">
                      <svc.Icon className="w-5 h-5 text-[#4A3428]" />
                    </div>
                    <div>
                      <div className="text-base sm:text-lg font-bold text-gray-900">
                        {svc.name}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 leading-relaxed">
                        {svc.description}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-3 text-sm text-gray-700 md:pl-0 pl-14">
                    {svc.pricing}
                  </div>
                  <div className="md:col-span-3 flex md:justify-end md:pl-0 pl-14">
                    <span
                      className={`inline-block px-3 py-1 text-xs font-bold rounded-full border tracking-wide uppercase ${BADGE_STYLES[svc.tone]}`}
                    >
                      {svc.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionRef>

        {/* ===================================================================
            Section 7 — Who We Work With
            =================================================================== */}
        <SectionRef
          id="who"
          label="07 — Who We Work With"
          register={registerRef}
        >
          <div className="max-w-4xl">
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Built for businesses that run on{' '}
              <span className="text-[#4A3428]">local trust.</span>
            </h2>
            <p className="mt-5 text-base sm:text-xl text-gray-600 leading-relaxed">
              If your best new customers come from word of mouth and Google
              searches — this is for you.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-6 gap-5 sm:gap-6">
            {AUDIENCE_CARDS.map((card, idx) => {
              const isSecondRowStart = idx === 3;
              return (
                <div
                  key={card.title}
                  className={`bg-white p-6 rounded-xl border border-[#C9A961]/20 shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:border-[#C9A961]/50 transition-all duration-300 md:col-span-2 ${
                    isSecondRowStart ? 'md:col-start-2' : ''
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-[#E8DCC8] flex items-center justify-center mb-4">
                    <card.Icon className="w-5 h-5 text-[#4A3428]" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                    {card.body}
                  </p>
                </div>
              );
            })}
          </div>
        </SectionRef>

        {/* ===================================================================
            Section 8 — Guarantee
            =================================================================== */}
        <SectionRef
          id="guarantee"
          label="08 — Guarantee"
          register={registerRef}
          className="bg-gray-50/70"
        >
          <div className="max-w-4xl">
            <h2 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight">
              Results or you{' '}
              <span className="text-[#4A3428]">don&apos;t pay.</span>
            </h2>
            <p className="mt-5 text-base sm:text-xl text-gray-600 leading-relaxed">
              We&apos;re confident enough in what we do to back it with our
              money.
            </p>
          </div>

          <div className="mt-10 max-w-4xl rounded-xl border-2 border-[#C9A961] bg-gradient-to-br from-[#E8DCC8]/60 via-white to-[#E8DCC8]/30 p-6 sm:p-10 shadow-lg relative overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#C9A961]/25 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#4A3428]/5 blur-3xl"
            />
            <div className="relative flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-full bg-[#4A3428] flex items-center justify-center shadow-md ring-4 ring-[#C9A961]/30">
                <ShieldCheck className="w-7 h-7 text-[#C9A961]" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold tracking-wider uppercase text-[#4A3428]">
                  The ReviewFlo Promise
                </div>
                <p className="mt-3 text-base sm:text-xl text-gray-900 leading-relaxed font-medium">
                  If you run a review campaign with us and don&apos;t see a
                  meaningful increase in Google reviews within 30 days of
                  launch, we&apos;ll make it right — either re-run the
                  campaign at no charge or issue a full refund. Your call.
                  We don&apos;t want your money if we didn&apos;t earn it.
                </p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-[#C9A961]/30 relative">
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                &ldquo;Meaningful increase&rdquo; is defined in context —
                we&apos;ll agree on a realistic target before your campaign
                launches based on your customer list size, industry, and
                current review baseline. Requires a minimum customer contact
                list of 50 people. We reserve the right to decline
                businesses we cannot ethically or effectively serve. We do
                not fabricate reviews, pay for reviews, or violate
                Google&apos;s review policies or FTC guidelines — ever. All
                campaigns are fully transparent to your customers.
              </p>
            </div>
          </div>
        </SectionRef>

        {/* ===================================================================
            Section 9 — Contact (mirrors homepage Final CTA treatment)
            =================================================================== */}
        <SectionRef
          id="contact"
          label="09 — Contact"
          register={registerRef}
          className="bg-gradient-to-br from-[#4A3428] to-[#3a2820] text-white"
        >
          <div className="max-w-4xl">
            <div className="mb-6">
              <GoldStars />
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
              20 minutes. We&apos;ll show you exactly what it looks like for
              your business.
            </h2>
            <p className="mt-5 text-base sm:text-xl text-[#E8DCC8]/80 leading-relaxed">
              Tell us what you&apos;re working with and we&apos;ll put
              together a specific plan — what we&apos;d build, what results
              you&apos;d likely see, and what it would cost. You decide from
              there.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            <a
              href="tel:+13855225040"
              className="group flex items-center gap-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-[#C9A961]/60 transition-all p-5"
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#C9A961] flex items-center justify-center">
                <Phone className="w-4 h-4 text-[#4A3428]" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#E8DCC8]/60">
                  Phone
                </div>
                <div className="mt-0.5 text-base sm:text-lg font-semibold text-white group-hover:text-[#C9A961] transition-colors">
                  (385) 522-5040
                </div>
              </div>
            </a>
            <a
              href="mailto:jeremy@usereviewflo.com"
              className="group flex items-center gap-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-[#C9A961]/60 transition-all p-5"
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#C9A961] flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#4A3428]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#E8DCC8]/60">
                  Email
                </div>
                <div className="mt-0.5 text-base sm:text-lg font-semibold text-white group-hover:text-[#C9A961] transition-colors break-all">
                  jeremy@usereviewflo.com
                </div>
              </div>
            </a>
            <a
              href="https://usereviewflo.com"
              className="group flex items-center gap-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-[#C9A961]/60 transition-all p-5"
            >
              <div className="shrink-0 w-10 h-10 rounded-full bg-[#C9A961] flex items-center justify-center">
                <Globe className="w-4 h-4 text-[#4A3428]" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-[#E8DCC8]/60">
                  Website
                </div>
                <div className="mt-0.5 text-base sm:text-lg font-semibold text-white group-hover:text-[#C9A961] transition-colors">
                  usereviewflo.com
                </div>
              </div>
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-2 sm:gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#E8DCC8]/80">
              <CheckCircle className="w-3.5 h-3.5 text-[#C9A961]" />
              FTC compliant
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#E8DCC8]/80">
              <CheckCircle className="w-3.5 h-3.5 text-[#C9A961]" />
              Google policy compliant
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#E8DCC8]/80">
              <CheckCircle className="w-3.5 h-3.5 text-[#C9A961]" />
              No fake reviews · Ever
            </span>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/reviewflo-logo.svg"
                alt="ReviewFlo"
                className="h-6 w-auto brightness-0 invert opacity-80"
              />
              <span className="text-xs text-[#E8DCC8]/50">
                powered by Elucidation Media LLC
              </span>
            </div>
            <p className="text-xs text-[#E8DCC8]/40">
              ReviewFlo &copy; 2026. All rights reserved.
            </p>
          </div>
        </SectionRef>
      </main>
    </>
  );
}
