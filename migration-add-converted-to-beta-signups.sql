-- Add converted column to beta_signups table
ALTER TABLE beta_signups
ADD COLUMN IF NOT EXISTS converted BOOLEAN NOT NULL DEFAULT false;

-- Create index on converted for faster queries
CREATE INDEX IF NOT EXISTS idx_beta_signups_converted ON beta_signups(converted);

-- Add updated_at column if it doesn't exist
ALTER TABLE beta_signups
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_beta_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_beta_signups_updated_at_trigger ON beta_signups;
CREATE TRIGGER update_beta_signups_updated_at_trigger
  BEFORE UPDATE ON beta_signups
  FOR EACH ROW
  EXECUTE FUNCTION update_beta_signups_updated_at();

-- Comment
COMMENT ON COLUMN beta_signups.converted IS 'True if this beta signup has been converted to a full business account';
