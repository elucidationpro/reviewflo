-- Supabase Performance & Security Lint Fixes
-- Addresses: RLS disabled on public tables, function search_path mutable

-- =============================================================================
-- 1. FIX FUNCTION SEARCH PATH (security - prevents search_path injection)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_beta_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_review_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- =============================================================================
-- 2. ENABLE RLS AND ADD POLICIES FOR PUBLIC TABLES
-- =============================================================================

-- --- BUSINESSES ---
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own business" ON businesses;
CREATE POLICY "Users can read own business" ON businesses
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read businesses by slug" ON businesses;
CREATE POLICY "Public can read businesses by slug" ON businesses
  FOR SELECT
  USING (true);
-- Note: Slug is public (used in review links). Sensitive ops use service_role.

-- --- FEEDBACK ---
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert feedback" ON feedback;
CREATE POLICY "Public can insert feedback" ON feedback
  FOR INSERT
  WITH CHECK (
    business_id IS NOT NULL
    AND business_id IN (SELECT id FROM businesses)
  );

DROP POLICY IF EXISTS "Owners can read and update own feedback" ON feedback;
CREATE POLICY "Owners can read and update own feedback" ON feedback
  FOR SELECT
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can resolve own feedback" ON feedback;
CREATE POLICY "Owners can resolve own feedback" ON feedback
  FOR UPDATE
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- --- REVIEWS ---
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert reviews" ON reviews;
CREATE POLICY "Public can insert reviews" ON reviews
  FOR INSERT
  WITH CHECK (
    business_id IS NOT NULL
    AND business_id IN (SELECT id FROM businesses)
  );

DROP POLICY IF EXISTS "Owners can read own reviews" ON reviews;
CREATE POLICY "Owners can read own reviews" ON reviews
  FOR SELECT
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- --- REVIEW_TEMPLATES ---
ALTER TABLE review_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read templates" ON review_templates;
CREATE POLICY "Public can read templates" ON review_templates
  FOR SELECT
  USING (true);
-- Templates are shown on public review flow; template_text is not sensitive

DROP POLICY IF EXISTS "Owners can manage own templates" ON review_templates;
CREATE POLICY "Owners can manage own templates" ON review_templates
  FOR ALL
  USING (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
  );

-- --- WAITLIST ---
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public waitlist signup" ON waitlist;
CREATE POLICY "Allow public waitlist signup" ON waitlist
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can read all waitlist entries" ON waitlist;
CREATE POLICY "Service role can read all waitlist entries" ON waitlist
  FOR SELECT
  USING (auth.role() = 'service_role');

-- --- INVITE_CODES (no anon access - admin only via service_role) ---
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- No policies = deny all for anon/authenticated. Service role bypasses RLS.

-- --- EARLY_ACCESS_SIGNUPS (admin/API only) ---
ALTER TABLE early_access_signups ENABLE ROW LEVEL SECURITY;

-- No policies = deny all for anon/authenticated. Service role bypasses RLS.

-- --- EARLY_ACCESS_CUSTOMERS (admin/Stripe webhook only) ---
ALTER TABLE early_access_customers ENABLE ROW LEVEL SECURITY;

-- Stripe webhook uses service_role. No anon policies needed.
