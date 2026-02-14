-- Link early access signup to business once admin creates full account
ALTER TABLE early_access_signups
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_early_access_signups_business_id
  ON early_access_signups(business_id) WHERE business_id IS NOT NULL;

COMMENT ON COLUMN early_access_signups.business_id IS 'Set when admin creates full ReviewFlo business for this signup';
