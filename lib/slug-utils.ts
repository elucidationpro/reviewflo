/**
 * Generate a URL slug from a business name.
 * Rules: lowercase, spaces→hyphens, remove special chars (& LLC Inc . ,), remove common words (the, a, an), max 30 chars.
 */
const COMMON_WORDS = new Set(['the', 'a', 'an']);

export function generateSlugFromBusinessName(businessName: string): string {
  if (!businessName || typeof businessName !== 'string') return '';

  let slug = businessName
    .toLowerCase()
    // Remove common suffixes (LLC, Inc, etc.) - handle with word boundary
    .replace(/\b(llc|inc|corp|co\.?|ltd\.?)\b/gi, '')
    // Remove punctuation: & , .
    .replace(/[&,.]/g, '')
    // Replace spaces and multiple separators with single hyphen
    .replace(/[\s\-_]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Keep only letters, numbers, hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  // Remove common words (the, a, an)
  const words = slug.split('-').filter((w) => !COMMON_WORDS.has(w));
  slug = words.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // Max 30 characters
  return slug.substring(0, 30);
}

/** Validate custom slug: letters, numbers, hyphens only, 3-30 chars, no leading/trailing hyphen */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  const normalized = slug.toLowerCase().trim().replace(/-+/g, '-');
  return normalized.length >= 3 && normalized.length <= 30 && SLUG_REGEX.test(normalized);
}

export function normalizeSlugForValidation(slug: string): string {
  return slug.toLowerCase().trim().replace(/-+/g, '-');
}
