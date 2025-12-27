-- Migration script to populate leads table from existing waitlist and beta_signups tables
-- This script handles duplicates by prioritizing beta_signups over waitlist entries

-- Step 1: Insert waitlist entries that don't exist in beta_signups
-- Status: 'waitlist' for non-converted entries
INSERT INTO leads (
  email,
  name,
  phone,
  business_name,
  business_type,
  status,
  business_id,
  challenge,
  source,
  created_at,
  updated_at
)
SELECT
  w.email,
  NULL as name, -- waitlist doesn't have name field
  w.phone,
  w.business_name,
  w.business_type,
  'waitlist' as status,
  NULL as business_id,
  NULL as challenge,
  'waitlist' as source,
  w.created_at,
  w.created_at as updated_at
FROM waitlist w
WHERE NOT EXISTS (
  -- Skip if this email already exists in beta_signups
  SELECT 1 FROM beta_signups b WHERE b.email = w.email
)
ON CONFLICT (email) DO NOTHING;

-- Step 2: Insert beta_signups entries that have NOT been converted
-- Status: 'beta_active' for active beta testers
INSERT INTO leads (
  email,
  name,
  phone,
  business_name,
  business_type,
  status,
  business_id,
  challenge,
  source,
  created_at,
  updated_at
)
SELECT
  b.email,
  b.name,
  b.phone,
  b.business_name,
  b.business_type,
  'beta_active' as status,
  NULL as business_id, -- Will be linked in next step if converted
  b.challenge,
  'beta' as source,
  b.created_at,
  b.created_at as updated_at
FROM beta_signups b
WHERE b.converted = false
ON CONFLICT (email) DO NOTHING;

-- Step 3: Insert beta_signups entries that HAVE been converted
-- Status: 'converted' with business_id link
-- We need to find the business_id by matching email to businesses.owner_email
INSERT INTO leads (
  email,
  name,
  phone,
  business_name,
  business_type,
  status,
  business_id,
  challenge,
  source,
  created_at,
  updated_at
)
SELECT
  b.email,
  b.name,
  b.phone,
  b.business_name,
  b.business_type,
  'converted' as status,
  bus.id as business_id, -- Link to the actual business
  b.challenge,
  'beta' as source,
  b.created_at,
  GREATEST(b.created_at, bus.created_at) as updated_at -- Use the most recent timestamp
FROM beta_signups b
INNER JOIN businesses bus ON bus.owner_email = b.email
WHERE b.converted = true
ON CONFLICT (email) DO NOTHING;

-- Step 4: Handle any beta signups marked as converted but without a matching business
-- These might be data inconsistencies - set them to beta_active
INSERT INTO leads (
  email,
  name,
  phone,
  business_name,
  business_type,
  status,
  business_id,
  challenge,
  source,
  created_at,
  updated_at
)
SELECT
  b.email,
  b.name,
  b.phone,
  b.business_name,
  b.business_type,
  'beta_active' as status, -- Keep as beta_active since we can't find their business
  NULL as business_id,
  b.challenge,
  'beta' as source,
  b.created_at,
  b.created_at as updated_at
FROM beta_signups b
WHERE b.converted = true
  AND NOT EXISTS (SELECT 1 FROM businesses bus WHERE bus.owner_email = b.email)
  AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.email = b.email)
ON CONFLICT (email) DO NOTHING;

-- Verification queries (commented out - uncomment to run after migration)
-- Check total count of migrated records
-- SELECT 'Total leads migrated:', COUNT(*) FROM leads;

-- Check breakdown by status
-- SELECT status, COUNT(*) as count FROM leads GROUP BY status ORDER BY status;

-- Check breakdown by source
-- SELECT source, COUNT(*) as count FROM leads GROUP BY source ORDER BY source;

-- Verify converted leads have business_id
-- SELECT COUNT(*) as converted_with_business FROM leads WHERE status = 'converted' AND business_id IS NOT NULL;
-- SELECT COUNT(*) as converted_without_business FROM leads WHERE status = 'converted' AND business_id IS NULL;

-- Check for any emails that exist in both waitlist and beta_signups (should prioritize beta)
-- SELECT
--   l.email,
--   l.status,
--   l.source,
--   CASE
--     WHEN EXISTS (SELECT 1 FROM waitlist w WHERE w.email = l.email) THEN 'Yes'
--     ELSE 'No'
--   END as in_waitlist,
--   CASE
--     WHEN EXISTS (SELECT 1 FROM beta_signups b WHERE b.email = l.email) THEN 'Yes'
--     ELSE 'No'
--   END as in_beta
-- FROM leads l
-- WHERE l.email IN (
--   SELECT email FROM waitlist
--   INTERSECT
--   SELECT email FROM beta_signups
-- );

COMMENT ON TABLE leads IS 'Migration completed: Data migrated from waitlist and beta_signups tables';
