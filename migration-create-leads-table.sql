-- Create leads table for unified customer journey tracking
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waitlist', 'beta_invited', 'beta_active', 'converted', 'declined')),
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  challenge TEXT,
  source TEXT DEFAULT 'waitlist',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique index on email for faster lookups and enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

-- Create index on status for filtering by lead status
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- Create index on created_at for sorting and date-based queries
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Create index on business_id for quick lookups of converted leads
CREATE INDEX IF NOT EXISTS idx_leads_business_id ON leads(business_id) WHERE business_id IS NOT NULL;

-- Create index on source for analytics
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leads_updated_at_trigger ON leads;
CREATE TRIGGER update_leads_updated_at_trigger
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public to insert (for waitlist/beta signups)
CREATE POLICY "Allow public to insert leads" ON leads
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow admin to read all leads
CREATE POLICY "Allow admin to read all leads" ON leads
  FOR SELECT
  USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' = 'jeremy.elucidation@gmail.com');

-- Policy: Allow admin to update leads
CREATE POLICY "Allow admin to update leads" ON leads
  FOR UPDATE
  USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' = 'jeremy.elucidation@gmail.com');

-- Policy: Allow admin to delete leads
CREATE POLICY "Allow admin to delete leads" ON leads
  FOR DELETE
  USING (auth.role() = 'service_role' OR auth.jwt() ->> 'email' = 'jeremy.elucidation@gmail.com');

-- Comments for documentation
COMMENT ON TABLE leads IS 'Unified customer journey tracking from waitlist to converted business';
COMMENT ON COLUMN leads.email IS 'Unique email address for the lead';
COMMENT ON COLUMN leads.status IS 'Current status in the customer journey: waitlist, beta_invited, beta_active, converted, or declined';
COMMENT ON COLUMN leads.business_id IS 'Foreign key to businesses table when lead converts to a full business';
COMMENT ON COLUMN leads.challenge IS 'Optional feedback about their biggest review challenge (from beta signup)';
COMMENT ON COLUMN leads.source IS 'Where the lead originated from (waitlist, referral, etc.)';
