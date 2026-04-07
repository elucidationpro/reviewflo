-- ============================================================
-- ReviewFlo: Automated Performance Tracking Schema
-- Migration: add_automated_tracking_tables.sql
-- Run in Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. google_business_snapshots
--    Daily snapshots of Google stats for trend tracking.
--    Cron job inserts one row per business per day.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS google_business_snapshots (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id           UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  snapshot_date         DATE        NOT NULL DEFAULT CURRENT_DATE,

  -- Core stats from Google
  total_reviews         INTEGER     NOT NULL DEFAULT 0,
  average_rating        NUMERIC(3,2) NOT NULL DEFAULT 0,

  -- Calculated deltas (populated by cron, comparing to prior snapshots)
  reviews_this_week     INTEGER     DEFAULT 0,   -- new reviews in past 7 days
  reviews_this_month    INTEGER     DEFAULT 0,   -- new reviews in past 30 days
  rating_change_week    NUMERIC(3,2) DEFAULT 0,  -- rating delta vs 7 days ago
  rating_change_month   NUMERIC(3,2) DEFAULT 0,  -- rating delta vs 30 days ago

  -- Metadata
  fetch_source          TEXT        DEFAULT 'places_api', -- 'places_api' | 'business_profile'
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Unique: one snapshot per business per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_snapshots_business_date
  ON google_business_snapshots (business_id, snapshot_date);

-- Query performance
CREATE INDEX IF NOT EXISTS idx_google_snapshots_business_id
  ON google_business_snapshots (business_id);
CREATE INDEX IF NOT EXISTS idx_google_snapshots_date
  ON google_business_snapshots (snapshot_date DESC);

-- RLS
ALTER TABLE google_business_snapshots ENABLE ROW LEVEL SECURITY;

-- Businesses can only see their own snapshots
CREATE POLICY "Business owners can read own snapshots"
  ON google_business_snapshots FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Only service role (cron) can insert/update
CREATE POLICY "Service role can manage snapshots"
  ON google_business_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 2. revenue_attribution
--    Manual entries: which customers came from Google reviews.
--    Businesses add these themselves via the dashboard form.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_attribution (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id          UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Sale details
  customer_name        TEXT,                        -- optional
  sale_amount          NUMERIC(10,2) NOT NULL,
  sale_date            DATE        NOT NULL DEFAULT CURRENT_DATE,

  -- Attribution
  attribution_source   TEXT        NOT NULL DEFAULT 'google_reviews',
  -- Allowed values: 'google_reviews' | 'facebook' | 'referral' | 'repeat_customer' | 'other'

  -- Optional CRM linkage
  crm_transaction_id   TEXT,
  notes                TEXT,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Query performance
CREATE INDEX IF NOT EXISTS idx_revenue_attribution_business_id
  ON revenue_attribution (business_id);
CREATE INDEX IF NOT EXISTS idx_revenue_attribution_sale_date
  ON revenue_attribution (business_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_attribution_source
  ON revenue_attribution (business_id, attribution_source);

-- RLS
ALTER TABLE revenue_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can manage own revenue attribution"
  ON revenue_attribution FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Admins (service role) can read all for aggregate analytics
CREATE POLICY "Service role can read all revenue attribution"
  ON revenue_attribution FOR SELECT
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 3. monthly_attribution_summary
--    Aggregated monthly rollup. Auto-updated whenever a sale
--    is added or removed via the API (upsert on conflict).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_attribution_summary (
  id                          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id                 UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  month                       DATE        NOT NULL,  -- First day of month: 2026-03-01

  -- Google Reviews attribution
  google_review_customers     INTEGER     NOT NULL DEFAULT 0,
  google_review_revenue       NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- All sources totals
  total_customers             INTEGER     NOT NULL DEFAULT 0,
  total_revenue               NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Calculated
  attribution_percentage      NUMERIC(5,2) DEFAULT 0, -- google_review_revenue / total_revenue * 100

  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Unique: one row per business per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_summary_business_month
  ON monthly_attribution_summary (business_id, month);

CREATE INDEX IF NOT EXISTS idx_monthly_summary_business_id
  ON monthly_attribution_summary (business_id);

-- RLS
ALTER TABLE monthly_attribution_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can read own monthly summary"
  ON monthly_attribution_summary FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage monthly summaries"
  ON monthly_attribution_summary FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 4. Patch: review_requests improvements
--    Add tracking token + platform column for funnel accuracy.
-- ─────────────────────────────────────────────────────────────

-- Unique token for tracking open/click without exposing internal IDs
ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

-- Which platform the customer ultimately clicked (set when platform button clicked)
ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS platform_selected TEXT;
-- Values: 'google' | 'facebook' | 'yelp' | null

-- Timestamps for funnel steps
ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;
ALTER TABLE review_requests
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

COMMENT ON COLUMN review_requests.tracking_token IS 'UUID token embedded in review link for open/click tracking without exposing DB IDs';
COMMENT ON COLUMN review_requests.platform_selected IS 'Platform the customer clicked: google, facebook, yelp (null = did not click)';


-- ─────────────────────────────────────────────────────────────
-- 5. Helper function: recompute monthly_attribution_summary
--    Called after any insert/delete in revenue_attribution.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION recalculate_monthly_summary(p_business_id UUID, p_month DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_start DATE := DATE_TRUNC('month', p_month)::DATE;
  v_month_end   DATE := (DATE_TRUNC('month', p_month) + INTERVAL '1 month - 1 day')::DATE;
  v_google_customers INTEGER;
  v_google_revenue   NUMERIC(10,2);
  v_total_customers  INTEGER;
  v_total_revenue    NUMERIC(10,2);
  v_pct              NUMERIC(5,2);
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE attribution_source = 'google_reviews'),
    COALESCE(SUM(sale_amount) FILTER (WHERE attribution_source = 'google_reviews'), 0),
    COUNT(*),
    COALESCE(SUM(sale_amount), 0)
  INTO v_google_customers, v_google_revenue, v_total_customers, v_total_revenue
  FROM revenue_attribution
  WHERE business_id = p_business_id
    AND sale_date BETWEEN v_month_start AND v_month_end;

  v_pct := CASE
    WHEN v_total_revenue > 0 THEN ROUND((v_google_revenue / v_total_revenue) * 100, 2)
    ELSE 0
  END;

  INSERT INTO monthly_attribution_summary
    (business_id, month, google_review_customers, google_review_revenue,
     total_customers, total_revenue, attribution_percentage, updated_at)
  VALUES
    (p_business_id, v_month_start, v_google_customers, v_google_revenue,
     v_total_customers, v_total_revenue, v_pct, NOW())
  ON CONFLICT (business_id, month) DO UPDATE SET
    google_review_customers = EXCLUDED.google_review_customers,
    google_review_revenue   = EXCLUDED.google_review_revenue,
    total_customers         = EXCLUDED.total_customers,
    total_revenue           = EXCLUDED.total_revenue,
    attribution_percentage  = EXCLUDED.attribution_percentage,
    updated_at              = NOW();
END;
$$;
