-- AI Tier Schema: businesses updates, ai_review_drafts, ai_review_responses, review_requests updates
-- Run after 20250311100000_pro_tier_schema.sql

-- =============================================================================
-- 1. UPDATE BUSINESSES TABLE
-- =============================================================================

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS sms_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS square_access_token TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS square_refresh_token TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS square_merchant_id TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS jobber_api_key TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS housecall_pro_api_key TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS custom_logo_url TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS custom_brand_name TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS custom_brand_color TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_type TEXT;

-- =============================================================================
-- 2. UPDATE REVIEW_REQUESTS (SMS, sent_via, triggered_by)
-- =============================================================================

-- Allow null customer_email for SMS-only requests
ALTER TABLE review_requests ALTER COLUMN customer_email DROP NOT NULL;
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS sent_via TEXT DEFAULT 'email';
ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS triggered_by TEXT;

-- =============================================================================
-- 3. CREATE AI_REVIEW_DRAFTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_review_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  review_request_id UUID REFERENCES review_requests(id) ON DELETE SET NULL,
  selected_keywords TEXT[],
  generated_text TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_business ON ai_review_drafts(business_id);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_request ON ai_review_drafts(review_request_id);

ALTER TABLE ai_review_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage own ai_review_drafts" ON ai_review_drafts;
CREATE POLICY "Owners can manage own ai_review_drafts" ON ai_review_drafts
  FOR ALL
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service role full access ai_review_drafts" ON ai_review_drafts;
CREATE POLICY "Service role full access ai_review_drafts" ON ai_review_drafts
  FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 4. CREATE AI_REVIEW_RESPONSES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_review_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  review_text TEXT,
  review_rating INTEGER,
  generated_response TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_responses_business ON ai_review_responses(business_id);

ALTER TABLE ai_review_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage own ai_review_responses" ON ai_review_responses;
CREATE POLICY "Owners can manage own ai_review_responses" ON ai_review_responses
  FOR ALL
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Service role full access ai_review_responses" ON ai_review_responses;
CREATE POLICY "Service role full access ai_review_responses" ON ai_review_responses
  FOR ALL
  USING (auth.role() = 'service_role');
