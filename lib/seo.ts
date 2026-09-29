/** Public search identity is independent of auth/billing environment settings. */
export const SITE_ORIGIN = 'https://www.usereviewflo.com'
export const PUBLIC_PATHS = ['/', '/about', '/pricing', '/features', '/demo', '/blog', '/for', '/terms', '/privacy-policy']

export function canonicalUrl(path: string): string {
  const clean = (path.split(/[?#]/)[0] || '/').replace(/\/+$/, '')
  return `${SITE_ORIGIN}${clean || '/'}`
}

/** Next route templates, not arbitrary business slugs. Keep private UI crawlable for noindex. */
export function isPublicPage(route: string): boolean {
  return PUBLIC_PATHS.includes(route) || route === '/for/[industry]' || route === '/blog/[slug]'
}
