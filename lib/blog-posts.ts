/**
 * Blog post frontmatter and content registry.
 * Each post in content/blog/ exports frontmatter and a default Content component.
 */

import type { ComponentType } from 'react'

export interface BlogPostFrontmatter {
  title: string
  description: string
  publishedAt: string
  slug: string
  keywords: string[]
}

export interface BlogPost {
  frontmatter: BlogPostFrontmatter
  Content: ComponentType
}

// Import all post content components (each exports frontmatter + default)
import HowToPreventBadGoogleReviews, { frontmatter as fm1 } from '@/content/blog/how-to-prevent-bad-google-reviews'
import HowToGetMoreGoogleReviews, { frontmatter as fm2 } from '@/content/blog/how-to-get-more-google-reviews'
import HowToRespondToNegativeGoogleReviews, { frontmatter as fm3 } from '@/content/blog/how-to-respond-to-negative-google-reviews'
import HowToGetMoreGoogleReviewsBarbershop, { frontmatter as fm4 } from '@/content/blog/how-to-get-more-google-reviews-barbershop'
import PodiumAlternativeSmallBusiness, { frontmatter as fm5 } from '@/content/blog/podium-alternative-small-business'

export const BLOG_POSTS: Record<string, BlogPost> = {
  'how-to-prevent-bad-google-reviews': { frontmatter: fm1, Content: HowToPreventBadGoogleReviews },
  'how-to-get-more-google-reviews': { frontmatter: fm2, Content: HowToGetMoreGoogleReviews },
  'how-to-respond-to-negative-google-reviews': { frontmatter: fm3, Content: HowToRespondToNegativeGoogleReviews },
  'how-to-get-more-google-reviews-barbershop': { frontmatter: fm4, Content: HowToGetMoreGoogleReviewsBarbershop },
  'podium-alternative-small-business': { frontmatter: fm5, Content: PodiumAlternativeSmallBusiness },
}

export function getBlogPost(slug: string): BlogPost | null {
  return BLOG_POSTS[slug] ?? null
}

export function getAllBlogSlugs(): string[] {
  return Object.keys(BLOG_POSTS)
}
