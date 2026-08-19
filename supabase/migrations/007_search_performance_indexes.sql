-- ============================================================
-- 007_search_performance_indexes.sql — Add indexes for fast document search
-- ============================================================

-- Index for case-insensitive search on original_filename
-- Uses pg_trgm extension for ILIKE pattern matching optimization
create extension if not exists pg_trgm;

-- GIN index on original_filename for fast ILIKE queries
create index if not exists documents_filename_trgm_idx
  on documents using gin (original_filename gin_trgm_ops);

-- GIN index on vendor_name extracted from raw_extraction JSONB
create index if not exists documents_vendor_name_trgm_idx
  on documents using gin ((raw_extraction->>'vendor_name') gin_trgm_ops);

-- Composite index for organization + status filtering (common query pattern)
create index if not exists documents_org_status_created_idx
  on documents(organization_id, status, created_at desc);

-- Add comment for documentation
comment on index documents_filename_trgm_idx is 'Trigram index for fast ILIKE search on document filenames';
comment on index documents_vendor_name_trgm_idx is 'Trigram index for fast ILIKE search on vendor names from extracted data';
comment on index documents_org_status_created_idx is 'Composite index for organization + status filtering with sort by created_at';
