-- Migration: Add skip_template_choice field to businesses table
-- When true, after 5 stars customers go straight to review links (no "Write Own" vs "Choose Template" choice)
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS skip_template_choice BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN businesses.skip_template_choice IS 'When true, 5-star customers skip the template choice and go straight to review platform links';

-- Enable for Emily Sharon Photo
UPDATE businesses SET skip_template_choice = true WHERE LOWER(business_name) LIKE '%emily sharon photo%';
