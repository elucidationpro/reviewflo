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

/** Slugs that conflict with app routes (e.g. /admin, /join) - cannot be used as business links */
export const RESERVED_SLUGS = new Set([
  'admin', 'join', 'login', 'signup', 'dashboard', 'settings',
  'early-access', 'qualify', 'terms', 'privacy-policy', 'survey',
  'onboarding', 'update-password', 'reset-password', 'api',
]);

export function isReservedSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  return RESERVED_SLUGS.has(slug.toLowerCase().trim());
}

/** Validate custom slug: letters, numbers, hyphens only, 3-30 chars, no leading/trailing hyphen */
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  const normalized = slug.toLowerCase().trim().replace(/-+/g, '-');
  if (isReservedSlug(normalized)) return false;
  return normalized.length >= 3 && normalized.length <= 30 && SLUG_REGEX.test(normalized);
}

export function normalizeSlugForValidation(slug: string): string {
  return slug.toLowerCase().trim().replace(/-+/g, '-');
}

/**
 * Generic industry/filler words dropped when generating a multi-location slug.
 * Goal: keep the distinctive brand word + append the city, e.g.
 *   "Serenity Medical Spa" + "Lake Ozark" → "serenity-lake-ozark"
 */
const LOCATION_FILLER_WORDS = new Set([
  'the', 'a', 'an', 'of', 'and',
  'medical', 'spa', 'salon', 'clinic', 'dental', 'dentist', 'dentistry',
  'health', 'wellness', 'care', 'therapy', 'studio', 'shop', 'store',
  'services', 'service', 'solutions', 'company', 'co', 'group', 'firm',
  'center', 'centre', 'office', 'llc', 'inc', 'corp', 'ltd',
  'pharmacy', 'market', 'bar', 'grill', 'cafe', 'restaurant',
]);

/**
 * Smart slug for a new location. Keeps the distinctive brand word(s) from the
 * business name and appends the city, capped at 30 chars.
 */
export function generateLocationSlug(businessName: string, city?: string): string {
  const baseSlug = generateSlugFromBusinessName(businessName || '');
  const baseWords = baseSlug.split('-').filter(Boolean);
  const distinctive = baseWords.filter((w) => !LOCATION_FILLER_WORDS.has(w));
  const brandWords = (distinctive.length > 0 ? distinctive : baseWords).slice(0, 2);

  const citySlug = city ? generateSlugFromBusinessName(city) : '';
  const cityWords = citySlug.split('-').filter(Boolean);

  let combined = [...brandWords, ...cityWords].join('-');
  if (combined.length > 30) {
    // Keep the city intact; trim the brand side.
    const cityPart = cityWords.join('-');
    const budget = Math.max(3, 30 - (cityPart ? cityPart.length + 1 : 0));
    const brandPart = brandWords.join('-').substring(0, budget).replace(/-+$/g, '');
    combined = cityPart ? `${brandPart}-${cityPart}` : brandPart;
  }
  return combined.replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 30);
}
