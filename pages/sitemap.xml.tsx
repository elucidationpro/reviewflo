import type { GetServerSideProps } from 'next'
import { getBlogPost } from '@/lib/blog-posts'
import { getPublishedSlugs } from '@/lib/blog-schedule'
import { getIndustrySlugs } from '@/lib/industries'

// IMPORTANT: this must match the Vercel primary domain (www is primary; non-www redirects to www).
const SITE = 'https://www.usereviewflo.com'

/**
 * Public, fixed routes (Pages Router) — excludes dynamic [slug], admin, dashboard, and API routes.
 * Do NOT include pages that have noindex meta tags — they contradict being in a sitemap.
 * Excluded: /qualify, /survey, /feedback, /join, /early-access, /early-access/join (all noindex).
 * Excluded: /privacy (re-export of /privacy-policy; 301 redirect handles old links).
 */
const STATIC_PATHS: string[] = [
  '/',
  '/about',
  '/pricing',
  '/terms',
  '/privacy-policy',
  '/demo',
  '/blog',
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
