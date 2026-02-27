-- Migration: Allow business owners to read their own business row (dashboard uses anon client + user JWT)
-- Without this policy, dashboard query .from('businesses').select().eq('user_id', user.id) returns no rows when RLS is enabled.

-- Enable RLS on businesses if not already (idempotent)
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (so we can re-run migration safely)
DROP POLICY IF EXISTS "Users can read own business" ON businesses;

-- Policy: Authenticated users can SELECT their own business (required for dashboard)
CREATE POLICY "Users can read own business" ON businesses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Note: INSERT/UPDATE/DELETE on businesses are done server-side with service_role (bypasses RLS).
-- No policy needed for those from the client.
