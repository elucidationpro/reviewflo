import fs from 'fs'
import path from 'path'

export interface IndustryFaqItem {
  q: string
  a: string
}

export interface IndustryData {
  slug: string
  industryName: string
  targetKeyword: string
  seo: {
    title: string
    description: string
    canonicalUrl: string
  }
  h1: string
  hero: {
    heading: string
    subheading: string
    cta: { label: string; href: string }
    stats: Array<{ value: string; label: string }>
    callout: string
  }
  socialProof: { text: string }
  painPoints: {
    sectionHeading: string
    items: Array<{ heading: string; body: string }>
  }
  howItWorks: {
    sectionHeading: string
    steps: Array<{ title: string; body: string }>
  }
  benefits: {
    sectionHeading: string
    items: Array<{ heading: string; body: string }>
  }
  testimonial?: {
    quote: string
    attribution: string
  }
  faq: {
    items: IndustryFaqItem[]
  }
  relatedIndustries: {
    items: Array<{ label: string; href: string }>
  }
  finalCta: {
    heading: string
    subheading: string
    buttonLabel: string
    buttonHref: string
  }
}

const INDUSTRIES_DIR = path.join(process.cwd(), 'data', 'industries')

export function getIndustrySlugs(): string[] {
  if (!fs.existsSync(INDUSTRIES_DIR)) return []
  return fs
    .readdirSync(INDUSTRIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
}

export function getIndustryData(slug: string): IndustryData | null {
  const filePath = path.join(INDUSTRIES_DIR, `${slug}.json`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw) as IndustryData
}

