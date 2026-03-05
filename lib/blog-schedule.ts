/**
 * Blog publishing schedule utility.
 * Filters and sorts posts by status, publish date, and priority.
 */

import scheduleData from '@/content/blog-schedule.json'

export type PostStatus = 'draft' | 'scheduled' | 'published'

export interface ScheduledPost {
  slug: string
  publishDate: string
  priority: number
  status: PostStatus
}

const schedule = scheduleData as { posts: ScheduledPost[] }

/**
 * Normalize a date string (YYYY-MM-DD) to start of day for comparison.
 */
function toDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get today's date at midnight (no time component) for comparison.
 */
function getToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/**
 * Get all scheduled posts that are live (publishDate <= today).
 * Filters by status (excludes "draft") and returns only posts whose publish date has passed.
 * Sorted by priority ascending (1 = highest / first).
 */
export function getPublishedPosts(asOfDate?: Date): ScheduledPost[] {
  const today = asOfDate ? new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate()) : getToday()

  return schedule.posts
    .filter((post) => {
      if (post.status === 'draft') return false
      const publishDate = toDateOnly(post.publishDate)
      return publishDate <= today
    })
    .sort((a, b) => a.priority - b.priority)
}

/**
 * Get all post slugs that are currently published (for routing / 404 checks).
 */
export function getPublishedSlugs(asOfDate?: Date): Set<string> {
  return new Set(getPublishedPosts(asOfDate).map((p) => p.slug))
}

/**
 * Check if a post is published (exists in schedule and publishDate <= today).
 */
export function isPostPublished(slug: string, asOfDate?: Date): boolean {
  return getPublishedSlugs(asOfDate).has(slug)
}

/**
 * Get schedule entry for a slug (for admin/debugging).
 */
export function getScheduleEntry(slug: string): ScheduledPost | null {
  return schedule.posts.find((p) => p.slug === slug) ?? null
}
