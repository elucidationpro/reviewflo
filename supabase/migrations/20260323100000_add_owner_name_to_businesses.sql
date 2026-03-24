-- Add owner_name (personal/individual name) to businesses for client emailing
-- Used when GBP lookup fails (Google profile name) and in magic link signup flow
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_name TEXT;

COMMENT ON COLUMN businesses.owner_name IS 'Business owner/contact personal name for direct client communication';
