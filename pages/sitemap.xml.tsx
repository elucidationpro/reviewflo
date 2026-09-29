import type { GetServerSideProps } from 'next'
import { getBlogPost } from '@/lib/blog-posts'
import { getPublishedSlugs } from '@/lib/blog-schedule'
import { getIndustrySlugs } from '@/lib/industries'

import { PUBLIC_PATHS, canonicalUrl } from '@/lib/seo'
import lastModified from '@/data/seo-lastmod.json'
import { getScheduleEntry } from '@/lib/blog-schedule'

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSitemapXml(paths: string[]): string {
  const body = paths
    .map((route) => {
      const contentDate = (lastModified as Record<string, string>)[route]
      const publishedDate = route.startsWith('/blog/') ? getScheduleEntry(route.slice(6))?.publishDate : undefined
      // A scheduled article cannot be last modified before it became public.
      const date = [contentDate, publishedDate].filter(Boolean).sort().at(-1)
      return `  <url><loc>${escapeXml(canonicalUrl(route))}</loc>${date ? `<lastmod>${date}</lastmod>` : ''}</url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`
}

function collectUrls(): string[] {
  const staticUrls = PUBLIC_PATHS

  const industryUrls = getIndustrySlugs().map((slug) => `/for/${encodeURIComponent(slug)}`)

  const published = getPublishedSlugs()
  const blogUrls = [...published]
    .filter((slug) => getBlogPost(slug))
    .map((slug) => `/blog/${encodeURIComponent(slug)}`)

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
