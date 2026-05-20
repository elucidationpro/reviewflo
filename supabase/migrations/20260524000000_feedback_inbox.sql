-- Link private feedback rows to the review that preceded them
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS review_id UUID
    REFERENCES reviews(id) ON DELETE SET NULL;

-- Allow owners to mark follow-up-only reviews resolved
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS owner_resolved_at TIMESTAMPTZ NULL;

-- Perf indexes
CREATE INDEX IF NOT EXISTS idx_feedback_review_id
  ON feedback(review_id) WHERE review_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_followup_business
  ON reviews(business_id, created_at DESC) WHERE followup_answer IS NOT NULL;
