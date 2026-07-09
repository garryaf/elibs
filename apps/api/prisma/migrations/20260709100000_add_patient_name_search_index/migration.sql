-- Enable trigram extension for partial-match name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add GIN trigram index on patient name for ILIKE searches
CREATE INDEX IF NOT EXISTS "patients_name_trgm_idx"
  ON "patients" USING gin ("name" gin_trgm_ops);
