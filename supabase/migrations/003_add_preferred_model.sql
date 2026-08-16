-- ============================================================
-- 003_add_preferred_model.sql — Add AI model selection
-- ============================================================

-- Add preferred_model column to organizations
alter table organizations add column preferred_model text default 'gemini-2.5-flash-latest' not null;

-- No additional RLS needed — existing policies already cover this column
