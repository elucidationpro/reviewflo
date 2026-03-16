-- Pro Tier Schema: businesses updates, review_requests, templates slots, google_business_stats
-- Run this migration in Supabase SQL Editor after applying any prior migrations

-- =============================================================================
-- 1. UPDATE BUSINESSES TABLE
-- =============================================================================

-- Add tier if not exists (may already exist from add_tier_columns)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'businesses_tier_check') THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_tier_check CHECK (tier IN ('free', 'pro', 'ai'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore if constraint exists
END $$;

-- Admin override for testing (sets tier without Stripe)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT FALSE;

-- interested_in_tier, launch_discount_eligible may already exist
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS interested_in_tier TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS launch_discount_eligible BOOLEAN DEFAULT TRUE;

-- Stripe & platform URLs
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_place_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS facebook_review_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS yelp_review_url TEXT;

-- Branding toggle (Pro feature)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS show_reviewflo_branding BOOLEAN DEFAULT TRUE;

-- =============================================================================
-- 2. CREATE REVIEW_REQUESTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  optional_note TEXT,
  review_link TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'opened', 'clicked', 'completed', 'feedback')),
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  platform_chosen TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_requests_business ON review_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests(status);
CREATE INDEX IF NOT EXISTS idx_review_requests_sent_at ON review_requests(sent_at);

-- RLS for review_requests
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage own review requests" ON review_requests;
CREATE POLICY "Owners can manage own review requests" ON review_requests
  FOR ALL
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- Service role can insert (for cron/send API)
DROP POLICY IF EXISTS "Service role full access review_requests" ON review_requests;
CREATE POLICY "Service role full access review_requests" ON review_requests
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 3. UPDATE REVIEW_TEMPLATES (slot_number, template_name)
-- =============================================================================

ALTER TABLE review_templates ADD COLUMN IF NOT EXISTS slot_number INTEGER DEFAULT 1;
ALTER TABLE review_templates ADD COLUMN IF NOT EXISTS template_name TEXT DEFAULT 'Template 1';

-- Set slot_number on existing rows: google=1, facebook=2, yelp=3
UPDATE review_templates SET slot_number = 1, template_name = 'Template 1' WHERE platform = 'google' AND (slot_number IS NULL OR slot_number = 0);
UPDATE review_templates SET slot_number = 2, template_name = 'Template 2' WHERE platform = 'facebook' AND (slot_number IS NULL OR slot_number = 0);
UPDATE review_templates SET slot_number = 3, template_name = 'Template 3' WHERE platform = 'yelp' AND (slot_number IS NULL OR slot_number = 0);
UPDATE review_templates SET slot_number = 1, template_name = COALESCE(template_name, 'Template 1') WHERE slot_number IS NULL;

-- =============================================================================
-- 4. CREATE GOOGLE_BUSINESS_STATS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS google_business_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  total_reviews INTEGER,
  average_rating DECIMAL(4,2),
  recent_reviews JSONB,
  reviews_this_month INTEGER,
  last_fetched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id)
);

CREATE INDEX IF NOT EXISTS idx_google_business_stats_business ON google_business_stats(business_id);

ALTER TABLE google_business_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read own google stats" ON google_business_stats;
CREATE POLICY "Owners can read own google stats" ON google_business_stats
  FOR SELECT
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service role full access google_stats" ON google_business_stats;
CREATE POLICY "Service role full access google_stats" ON google_business_stats
  FOR ALL
  USING (auth.role() = 'service_role');
