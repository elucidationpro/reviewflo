import type { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { getIndustryData, getIndustrySlugs } from '@/lib/industries'
import { SiteNav, SITE_NAV_SPACER_CLASS } from '@/components/SiteNav'
import SiteFooter from '@/components/SiteFooter'

type Industry = { slug: string; name: string }
export default function Industries({ industries }: { industries: Industry[] }) {
  return <>
    <Head>
      <title>Review Management by Industry | ReviewFlo</title>
      <meta name="description" content="Find review management tools for your local service business, from plumbers and mechanics to salons and cleaners." />
    </Head>
    <SiteNav />
    <main className={`${SITE_NAV_SPACER_CLASS} max-w-6xl mx-auto px-4 pb-16`}>
      <h1 className="text-4xl font-bold text-[#4A3428] pt-12 mb-6">Review management for your industry</h1>
      <p className="text-gray-600 mb-8">Explore how ReviewFlo helps local service businesses collect customer feedback and get more Google reviews. Choose your industry to see the features and workflow for your business.</p>
      <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {industries.map(industry => <li key={industry.slug}>
          <Link href={`/for/${industry.slug}`} className="block rounded-lg border border-gray-200 p-4 text-[#4A3428] hover:underline">{industry.name}</Link>
        </li>)}
      </ul>
    </main>
    <SiteFooter />
  </>
}
export const getStaticProps: GetStaticProps = async () => ({ props: {
  industries: getIndustrySlugs().map(slug => ({ slug, name: getIndustryData(slug)!.industryName })).sort((a,b) => a.name.localeCompare(b.name)),
} })
