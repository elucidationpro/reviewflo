-- Add show_business_name column to businesses table
-- Controls whether the business name is displayed on the customer review page.
-- Defaults to TRUE so all existing businesses are unaffected.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS show_business_name BOOLEAN NOT NULL DEFAULT TRUE;
