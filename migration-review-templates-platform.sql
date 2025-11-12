-- Migration: Add platform column and constraints to review_templates table
-- Run this SQL in your Supabase SQL Editor

-- 1. Add the platform column (text, nullable for now so we can migrate existing data)
ALTER TABLE review_templates
ADD COLUMN IF NOT EXISTS platform TEXT;

-- 2. Add the updated_at column
ALTER TABLE review_templates
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Set a default platform for existing records (so they don't get lost)
-- This sets all existing templates to 'google' as a migration default
-- You may want to manually update these after migration
UPDATE review_templates
SET platform = 'google'
WHERE platform IS NULL;

-- 4. Now make platform NOT NULL since all records have values
ALTER TABLE review_templates
ALTER COLUMN platform SET NOT NULL;

-- 5. Make business_id NOT NULL if it isn't already
ALTER TABLE review_templates
ALTER COLUMN business_id SET NOT NULL;

-- 6. Add foreign key constraint on business_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'review_templates_business_id_fkey'
        AND table_name = 'review_templates'
    ) THEN
        ALTER TABLE review_templates
        ADD CONSTRAINT review_templates_business_id_fkey
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 7. Add unique constraint on (business_id, platform)
-- Drop it first if it exists (in case of re-running)
ALTER TABLE review_templates
DROP CONSTRAINT IF EXISTS review_templates_business_platform_key;

ALTER TABLE review_templates
ADD CONSTRAINT review_templates_business_platform_key
UNIQUE (business_id, platform);

-- 8. Add a check constraint to ensure platform is one of the valid values
ALTER TABLE review_templates
DROP CONSTRAINT IF EXISTS review_templates_platform_check;

ALTER TABLE review_templates
ADD CONSTRAINT review_templates_platform_check
CHECK (platform IN ('google', 'facebook', 'yelp'));

-- 9. Add comments to document the columns
COMMENT ON COLUMN review_templates.platform IS 'Review platform: google, facebook, or yelp';
COMMENT ON COLUMN review_templates.template_text IS 'The review template text that customers can copy';
COMMENT ON COLUMN review_templates.business_id IS 'Foreign key to businesses table';
COMMENT ON COLUMN review_templates.updated_at IS 'Timestamp when the template was last updated';

-- 10. Create or replace function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_review_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to call the function before updates
DROP TRIGGER IF EXISTS review_templates_updated_at_trigger ON review_templates;

CREATE TRIGGER review_templates_updated_at_trigger
BEFORE UPDATE ON review_templates
FOR EACH ROW
EXECUTE FUNCTION update_review_templates_updated_at();

-- Migration complete!
-- Note: Existing templates were migrated to platform='google' by default
-- You may want to review and update these manually or delete duplicates
