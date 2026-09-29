/** Run after content edits are committed. Dates come from content history, never request/build time. */
import { execFileSync } from 'node:child_process'
import { readdirSync, writeFileSync } from 'node:fs'
function modified(...files) {
  const dates = execFileSync('git', ['log', '--format=%cs', '--', ...files], { encoding: 'utf8' }).trim().split('\n').filter(Boolean)
  if (!dates.length) throw new Error(`Commit new content before generating its lastmod: ${files.join(', ')}`)
  return dates.sort().at(-1)
}
const dates = {}
for (const [route, file] of Object.entries({ '/': 'index', '/about': 'about', '/pricing': 'pricing', '/features': 'features', '/demo': 'demo', '/terms': 'terms', '/privacy-policy': 'privacy-policy', '/for': 'for/index', '/blog': 'blog/index' })) {
  dates[route] = modified(`pages/${file}.tsx`)
}
for (const file of readdirSync('data/industries').filter(f => f.endsWith('.json'))) dates[`/for/${file.slice(0,-5)}`] = modified(`data/industries/${file}`)
for (const file of readdirSync('content/blog').filter(f => f.endsWith('.tsx'))) dates[`/blog/${file.slice(0,-4)}`] = modified(`content/blog/${file}`)
writeFileSync('data/seo-lastmod.json', JSON.stringify(dates, null, 2)+'\n')
