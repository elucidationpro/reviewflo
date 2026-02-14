-- Early access customers: one row per successful Stripe payment (webhook writes here)
CREATE TABLE IF NOT EXISTS early_access_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  amount_paid INTEGER,
  currency TEXT,
  payment_status TEXT,
  access_start_date TIMESTAMPTZ,
  access_end_date TIMESTAMPTZ,
  source TEXT DEFAULT 'early_access',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_early_access_customers_email ON early_access_customers(email);
CREATE INDEX IF NOT EXISTS idx_early_access_customers_stripe_session ON early_access_customers(stripe_session_id);

COMMENT ON TABLE early_access_customers IS 'Early access: payment records from Stripe webhook';
