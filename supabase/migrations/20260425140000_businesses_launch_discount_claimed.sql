-- Was only documented in repo-root migration-businesses-tier-fields.sql; add to migration chain
-- so Supabase projects pick it up. Safe if already applied manually.
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS launch_discount_claimed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN businesses.launch_discount_claimed IS 'True when user has claimed the 50% launch discount (for future use)';
