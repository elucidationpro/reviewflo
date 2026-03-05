-- Migration: Add tier and launch notification fields to businesses table
-- Run this SQL in your Supabase SQL Editor
-- Used by qualify signup: tier selection (Free / Pro / AI), launch notifications, discount eligibility

-- Tier: 'free' for now; future: 'pro', 'ai'
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'free';

COMMENT ON COLUMN businesses.tier IS 'Current plan: free, pro, ai (all signups start as free)';

-- Which upcoming tier they want to be notified about (demand validation)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS interested_in_tier TEXT;

COMMENT ON COLUMN businesses.interested_in_tier IS 'Pro or AI tier they want notification for at launch (null = free only)';

-- Whether to email them when that tier launches
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS notify_on_launch BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN businesses.notify_on_launch IS 'True if user asked to be notified when Pro/AI launches';

-- Early signups (before May 2026) get 50% off first 3 months
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS launch_discount_eligible BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN businesses.launch_discount_eligible IS 'True for signups before Pro/AI launch (May 2026); eligible for 50% off first 3 months';

-- Future use: set true when user claims the 50% launch discount
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS launch_discount_claimed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN businesses.launch_discount_claimed IS 'True when user has claimed the 50% launch discount (for future use)';
