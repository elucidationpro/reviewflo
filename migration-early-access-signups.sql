-- Early access signups: account + survey before payment, then link Stripe on webhook
CREATE TABLE IF NOT EXISTS early_access_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  business_type TEXT,
  customers_per_month TEXT,
  review_asking_frequency TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  access_start_date TIMESTAMPTZ,
  access_end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_early_access_signups_user_id ON early_access_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_early_access_signups_email ON early_access_signups(email);

COMMENT ON TABLE early_access_signups IS 'Early access flow: account + survey saved here; Stripe fields filled on payment webhook';
