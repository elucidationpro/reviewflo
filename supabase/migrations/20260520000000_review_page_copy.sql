-- Pro/AI: customizable headline and subtext on the public review page (/{slug}).
-- NULL = use app defaults in lib/review-page-copy.ts.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS review_page_headline TEXT,
  ADD COLUMN IF NOT EXISTS review_page_subtext TEXT;

COMMENT ON COLUMN businesses.review_page_headline IS
  'Optional custom headline on the public star-rating page (max 120 chars). NULL uses default: How was your experience?';

COMMENT ON COLUMN businesses.review_page_subtext IS
  'Optional custom subtext below the stars (max 80 chars). NULL uses default: Tap a star to rate';
