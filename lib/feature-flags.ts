/**
 * Central feature flags.
 *
 * REVIEW_TEMPLATES_ENABLED — when false, all public-facing mentions of review
 * templates (pre-written review text suggestions) are hidden. Kept as a flag
 * rather than deletion so we can flip it back on if we resolve the compliance
 * concerns around biasing review content.
 */
export const REVIEW_TEMPLATES_ENABLED = false
