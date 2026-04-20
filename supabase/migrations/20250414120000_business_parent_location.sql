-- Multi-location: optional parent row (account root). Children share user_id with root.
-- Free: 1 location · Pro: 3 · AI: 15 (enforced in app).

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS parent_business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_businesses_parent_business_id ON businesses(parent_business_id);

COMMENT ON COLUMN businesses.parent_business_id IS 'NULL = account root; set to root id for additional locations';

-- At most one root (no parent) per auth user
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_one_root_per_user
  ON businesses (user_id)
  WHERE parent_business_id IS NULL AND user_id IS NOT NULL;
