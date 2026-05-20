-- Pro/AI: optional follow-up question after star rating on /{slug}.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS review_page_followup_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_page_followup_question TEXT,
  ADD COLUMN IF NOT EXISTS review_page_followup_placeholder TEXT;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS followup_answer TEXT;

COMMENT ON COLUMN businesses.review_page_followup_enabled IS
  'When true and question is set, customers see one follow-up question after rating (Pro/AI).';

COMMENT ON COLUMN businesses.review_page_followup_question IS
  'Custom question shown after star tap (max 200 chars).';

COMMENT ON COLUMN businesses.review_page_followup_placeholder IS
  'Optional placeholder for the customer answer field (max 200 chars).';

COMMENT ON COLUMN reviews.followup_answer IS
  'Customer answer to the optional post-rating follow-up question (max 500 chars).';
