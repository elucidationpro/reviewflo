-- Marketing email unsubscribes for ReviewFlo's own outbound emails (Pro launch, etc.)
-- Separate from the campaign `unsubscribes` table which tracks business-to-customer opt-outs.

CREATE TABLE IF NOT EXISTS marketing_unsubscribes (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE marketing_unsubscribes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access marketing_unsubscribes" ON marketing_unsubscribes;
CREATE POLICY "Service role full access marketing_unsubscribes" ON marketing_unsubscribes
  FOR ALL
  USING (auth.role() = 'service_role');
