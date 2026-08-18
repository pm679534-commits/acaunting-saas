-- ============================================================
-- 002_add_line_items.sql — Line-item extraction support
-- ============================================================

-- ── document_line_items ──────────────────────────────────────
create table document_line_items (
  id                uuid primary key default gen_random_uuid(),
  document_id       uuid not null references documents(id) on delete cascade,
  line_number       integer not null,
  description       text,
  amount            numeric,
  currency          text,
  date              text,
  category          text,
  created_at        timestamptz default now()
);

alter table document_line_items enable row level security;

-- Users can access line items for documents in their org
create policy "line_items_select" on document_line_items
  for select using (
    document_id in (
      select id from documents where organization_id = get_user_organization_id()
    )
  );

create policy "line_items_insert" on document_line_items
  for insert with check (
    document_id in (
      select id from documents where organization_id = get_user_organization_id()
    )
  );

create policy "line_items_delete" on document_line_items
  for delete using (
    document_id in (
      select id from documents where organization_id = get_user_organization_id()
    )
  );

create index line_items_document_idx on document_line_items(document_id, line_number);
