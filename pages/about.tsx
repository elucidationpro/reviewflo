import Head from 'next/head'
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'

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

        <section className="relative overflow-hidden bg-gradient-to-br from-[#E8DCC8]/30 via-white to-[#E8DCC8]/30 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              About ReviewFlo
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Built for small, service-based businesses that live and die by word of
              mouth — barbers, detailers, trades, and local operators who don&apos;t have time to
              wrestle with complicated software.
            </p>
          </div>
        </section>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="space-y-10 text-gray-600 leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Why we&apos;re here
              </h2>
              <p>
                One unfair 1-star review can hurt a small business more than it hurts a big brand.
                ReviewFlo helps you intercept unhappy customers privately, fix issues directly, and
                turn happy customers into public 5-star Google reviews.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Built in Utah, for operators everywhere
              </h2>
              <p>
                ReviewFlo is based in Utah and shaped with feedback from local service businesses.
                The goal is simple: a tool you can set up once, hand to your team, and trust to keep
                reviews flowing without extra work.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                What&apos;s next
              </h2>
              <p>
                Today, ReviewFlo focuses on getting you more 5-star Google reviews and catching
                negative experiences before they go public. Pro and AI tiers launch in May 2026 with
                automation, SMS, and more advanced tools — always with a &quot;simple first&quot;
                mindset.
              </p>
            </section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  )
}

