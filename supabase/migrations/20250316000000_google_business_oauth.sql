-- Add Google Business Profile OAuth fields to businesses table

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_oauth_access_token TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_oauth_refresh_token TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_oauth_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS google_business_name TEXT;

-- Add comment explaining the fields
COMMENT ON COLUMN businesses.google_oauth_access_token IS 'Google OAuth access token for Business Profile API';
COMMENT ON COLUMN businesses.google_oauth_refresh_token IS 'Google OAuth refresh token (long-lived)';
COMMENT ON COLUMN businesses.google_oauth_expires_at IS 'When the access token expires';
COMMENT ON COLUMN businesses.google_business_name IS 'Business name from Google Business Profile';
