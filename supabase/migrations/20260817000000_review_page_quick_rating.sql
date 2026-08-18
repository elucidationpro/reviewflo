-- Pro/AI: one-tap "Great / Not great" first step on /{slug} instead of the 5-star picker.
--
-- Compliance note: this only changes how the FIRST tap is captured. Routing after the
-- rating is unchanged — 1-4 stars still go to the private feedback form (which shows the
-- Google link), 5 stars still go to the public review CTA. Nothing is hidden by sentiment.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS review_page_quick_rating_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_page_quick_rating_destination TEXT NOT NULL DEFAULT 'platform_choice';

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS rating_source TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'businesses_quick_rating_destination_check'
  ) THEN
    ALTER TABLE businesses
      ADD CONSTRAINT businesses_quick_rating_destination_check
      CHECK (review_page_quick_rating_destination IN ('platform_choice', 'google'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_rating_source_check'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_rating_source_check
      CHECK (rating_source IS NULL OR rating_source IN ('stars', 'quick_positive', 'quick_stars'));
  END IF;
END $$;

COMMENT ON COLUMN businesses.review_page_quick_rating_enabled IS
  'When true (Pro/AI), /{slug} shows a one-tap Great/Not great step instead of the 5-star picker.';

COMMENT ON COLUMN businesses.review_page_quick_rating_destination IS
  'Where a positive quick tap lands: platform_choice (review platform list, default) or google (straight to the Google review URL).';

COMMENT ON COLUMN reviews.rating_source IS
  'How the star rating was captured: stars (5-star picker), quick_positive (tapped Great), quick_stars (tapped Not great, then picked a star). NULL for rows written before quick rating shipped.';
