-- Migration: Add terms_accepted_at field to businesses table
-- Run this SQL in your Supabase SQL Editor

-- Add the terms_accepted_at column to the businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Add a comment to document the field
COMMENT ON COLUMN businesses.terms_accepted_at IS 'Timestamp when the business owner accepted the Terms of Service and Privacy Policy';

-- Optionally, set the current timestamp for existing businesses (they implicitly accepted by using the service)
-- Uncomment the line below if you want to backfill existing records:
-- UPDATE businesses SET terms_accepted_at = created_at WHERE terms_accepted_at IS NULL;
