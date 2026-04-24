-- GBP OAuth tokens are now per-location (per business row), not per-user.
-- The oauth callback targets a specific business_id via the OAuth state param.
-- See pages/api/auth/google/callback.ts.

COMMENT ON COLUMN businesses.google_oauth_refresh_token IS
  'Per-location GBP OAuth refresh token. Each row (primary + children) holds its own connection.';
COMMENT ON COLUMN businesses.google_oauth_access_token IS
  'Per-location GBP OAuth access token.';
COMMENT ON COLUMN businesses.google_oauth_expires_at IS
  'Per-location GBP OAuth token expiry.';
COMMENT ON COLUMN businesses.google_place_id IS
  'Per-location Google Place ID.';
COMMENT ON COLUMN businesses.google_business_name IS
  'Per-location GBP business name as returned by the API.';
COMMENT ON COLUMN businesses.google_review_url IS
  'Per-location public Google review URL.';
