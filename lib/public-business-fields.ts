/** Explicit allowlist: public page props must never contain contact, billing or OAuth data. */
export const PUBLIC_BUSINESS_FIELDS = [
  'id', 'business_name', 'slug', 'primary_color', 'tier', 'logo_url',
  'google_review_url', 'facebook_review_url', 'yelp_review_url', 'nextdoor_review_url',
  'skip_template_choice', 'show_reviewflo_branding', 'show_business_name',
  'white_label_enabled', 'custom_logo_url', 'custom_brand_name', 'custom_brand_color',
  'review_page_headline', 'review_page_subtext', 'review_page_followup_enabled',
  'review_page_followup_question', 'review_page_followup_placeholder',
] as const

export function publicBusinessFields(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(PUBLIC_BUSINESS_FIELDS.filter(key => key in row).map(key => [key, row[key]]))
}
