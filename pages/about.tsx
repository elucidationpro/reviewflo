import Head from 'next/head'
import Link from 'next/link'
import { MapPin, Zap, Heart, ArrowRight } from 'lucide-react'
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'

const stats = [
  { value: 'Beta', label: 'Early access' },
  { value: '5 min', label: 'Setup time' },
  { value: '$0', label: 'Free forever' },
  { value: '5★', label: 'Review focus' },
]

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About ReviewFlo</title>
        <meta
          name="description"
          content="Learn why ReviewFlo exists and how we help small service businesses get more 5-star Google reviews."
        />
        <meta name="robots" content="index, follow" />
      </Head>
      <div className="min-h-screen bg-white">
        <SiteNav variant="marketing" />
        <div className={SITE_NAV_SPACER_CLASS} />

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/40 via-white to-[#E8DCC8]/30 py-14 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E8DCC8] text-[#4A3428] text-xs font-semibold rounded-full mb-5 tracking-wide uppercase">
              <MapPin className="w-3 h-3" />
              Built in Utah
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-5 leading-tight">
              About ReviewFlo
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Built for small, service-based businesses that live and die by word of
              mouth — barbers, detailers, trades, and local operators who don&apos;t have time to
              wrestle with complicated software.
            </p>
          </div>
        </section>

        {/* Stats bar */}
        <div className="border-y border-gray-100 bg-gray-50/60">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100">
              {stats.map(({ value, label }) => (
                <div key={label} className="py-6 text-center">
                  <p className="text-2xl sm:text-3xl font-bold text-[#4A3428]">{value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Story sections */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="space-y-12">

            <div className="flex gap-6">
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 bg-[#E8DCC8] rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-[#4A3428]" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Why we&apos;re here</h2>
                <p className="text-gray-600 leading-relaxed">
                  One unfair 1-star review can hurt a small business more than it hurts a big brand.
                  ReviewFlo helps you intercept unhappy customers privately, fix issues directly, and
                  turn happy customers into public 5-star Google reviews — automatically, with no extra work.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 bg-[#E8DCC8] rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#4A3428]" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Built in Utah, for operators everywhere</h2>
                <p className="text-gray-600 leading-relaxed">
                  ReviewFlo is based in Utah and shaped with feedback from local service businesses —
                  barbers, HVAC pros, auto detailers, plumbers, electricians, and cleaners.
                  The goal is a tool you can set up once, hand to your team, and trust to keep
                  reviews flowing without extra work.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 bg-[#E8DCC8] rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#4A3428]" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">What&apos;s next</h2>
                <p className="text-gray-600 leading-relaxed">
                  Today, ReviewFlo focuses on getting you more 5-star Google reviews and catching
                  negative experiences before they go public. Pro and AI tiers launch in May 2026 with
                  SMS automation, dashboard sending, and AI-powered features — always with a
                  &quot;simple first&quot; mindset.
                </p>
              </div>
            </div>

          </div>

          {/* Founder note */}
          <div className="mt-14 bg-gradient-to-br from-[#E8DCC8]/40 to-[#C9A961]/10 border border-[#C9A961]/30 rounded-2xl p-6 sm:p-8">
            <p className="text-gray-700 text-base leading-relaxed italic mb-4">
              &quot;I built ReviewFlo because the tools that existed were either too expensive, too
              complicated, or built for big brands — not the shop owner who does 8 jobs a day and
              has 2 minutes to deal with software.&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#4A3428] flex items-center justify-center text-white text-sm font-bold">
                J
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Jeremy</p>
                <p className="text-xs text-gray-500">Founder, ReviewFlo · Utah</p>
              </div>
            </div>
          </div>
        </main>

        {/* CTA */}
        <section className="border-t border-gray-100 bg-gray-50/50 py-14 sm:py-16">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to grow your reviews?</h2>
            <p className="text-gray-600 mb-7">Free forever. Takes 5 minutes to set up.</p>
            <Link
              href="/join"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Start Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  )
}
