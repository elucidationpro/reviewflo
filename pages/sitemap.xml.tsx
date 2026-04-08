import type { GetServerSideProps } from 'next'
import { getBlogPost } from '@/lib/blog-posts'
import { getPublishedSlugs } from '@/lib/blog-schedule'
import { getIndustrySlugs } from '@/lib/industries'

const SITE = 'https://usereviewflo.com'

/**
 * Public, fixed routes (Pages Router) — excludes dynamic [slug], admin, dashboard, and API routes.
 */
const STATIC_PATHS: string[] = [
  '/',
  '/about',
  '/pricing',
  '/terms',
  '/privacy',
  '/privacy-policy',
  '/demo',
  '/qualify',
  '/survey',
  '/feedback',
  '/login',
  '/signup',
  '/join',
  '/reset-password',
  '/update-password',
  '/blog',
  '/early-access',
  '/early-access/join',
]

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSitemapXml(urls: string[]): string {
  const body = urls
    .map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
}

function collectUrls(): string[] {
  const staticUrls = STATIC_PATHS.map((p) => (p === '/' ? SITE : `${SITE}${p}`))

  const industryUrls = getIndustrySlugs().map((slug) => `${SITE}/for/${encodeURIComponent(slug)}`)

  const published = getPublishedSlugs()
  const blogUrls = [...published]
    .filter((slug) => getBlogPost(slug))
    .map((slug) => `${SITE}/blog/${encodeURIComponent(slug)}`)

  return Array.from(new Set([...staticUrls, ...industryUrls, ...blogUrls])).sort()
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const xml = buildSitemapXml(collectUrls())
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  res.write(xml)
  res.end()
  return { props: {} }
}

export default function SitemapXml() {
  return null
}
