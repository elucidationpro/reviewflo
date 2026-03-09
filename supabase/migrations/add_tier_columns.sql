-- Add tier-related columns to businesses table
-- These columns support the Pro/AI tier launch functionality

-- Add tier column (free, pro, ai) - defaults to free for existing businesses
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'ai'));

-- Add interested_in_tier column for users who want to be notified when Pro/AI launches
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS interested_in_tier TEXT CHECK (interested_in_tier IN ('pro', 'ai') OR interested_in_tier IS NULL);

-- Add notify_on_launch flag for email notifications when their chosen tier launches
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS notify_on_launch BOOLEAN DEFAULT false;

-- Add launch_discount_eligible flag for early signup discount (50% off first 3 months)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS launch_discount_eligible BOOLEAN DEFAULT true;

-- Create index for tier queries
CREATE INDEX IF NOT EXISTS idx_businesses_tier ON businesses(tier);

-- Create index for interested_in_tier queries (for finding users to notify)
CREATE INDEX IF NOT EXISTS idx_businesses_interested_in_tier ON businesses(interested_in_tier) WHERE interested_in_tier IS NOT NULL;

COMMENT ON COLUMN businesses.tier IS 'Current subscription tier: free, pro, or ai';
COMMENT ON COLUMN businesses.interested_in_tier IS 'Tier user wants to be notified about when it launches (May 2026)';
COMMENT ON COLUMN businesses.notify_on_launch IS 'Whether to send email notification when interested_in_tier launches';
COMMENT ON COLUMN businesses.launch_discount_eligible IS 'Eligible for 50% off first 3 months launch discount';
