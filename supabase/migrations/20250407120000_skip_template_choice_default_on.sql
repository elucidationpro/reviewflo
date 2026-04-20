-- Default: after 5 stars, skip the template picker (straight to review links) unless the business turns templates on.
-- Safe if an older migration already added this column with a different default.

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS skip_template_choice BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN businesses.skip_template_choice IS 'When true, five-star customers skip the template choice and go straight to review platform links';

ALTER TABLE businesses ALTER COLUMN skip_template_choice SET DEFAULT true;
