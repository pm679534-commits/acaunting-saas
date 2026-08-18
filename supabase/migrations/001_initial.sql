-- ============================================================
-- 001_initial.sql — Accounting SaaS schema + RLS
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── organizations ────────────────────────────────────────────
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

alter table organizations enable row level security;

create policy "org_select" on organizations
  for select using (id = get_user_organization_id());

create policy "org_insert" on organizations
  for insert with check (true);  -- allowed during signup flow via service role

create policy "org_update" on organizations
  for update using (id = get_user_organization_id());

-- ── profiles (1:1 with auth.users) ──────────────────────────
create table profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid references organizations(id) on delete set null,
  full_name        text,
  role             text default 'owner' check (role in ('owner','admin','member')),
  created_at       timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());

create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

create policy "profiles_insert_own" on profiles
  for insert with check (id = auth.uid());

-- ── Helper: org for current user ─────────────────────────────
create or replace function get_user_organization_id()
returns uuid language sql security definer stable as $$
  select organization_id from profiles where id = auth.uid()
$$;

-- ── subscription_plans (seeded below) ────────────────────────
create table subscription_plans (
  id              text primary key,
  name            text not null,
  price_azn       numeric not null,
  document_limit  integer not null,
  features        jsonb default '[]'
);

-- no RLS needed — plans are public reference data
insert into subscription_plans (id, name, price_azn, document_limit, features) values
  ('starter',    'Başlanğıc',  29,  5,  '["Aylıq 5 sənəd","Excel export","E-poçt dəstəyi"]'),
  ('pro',        'Professional', 79, 500, '["Aylıq 500 sənəd","Excel export","Prioritet dəstək","API çıxışı"]'),
  ('enterprise', 'Korporativ', 0,   9999, '["Limitsiz sənədlər","Excel export","Xüsusi inteqrasiya","SLA"]');

-- ── subscriptions ────────────────────────────────────────────
create table subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  plan_id               text not null references subscription_plans(id),
  status                text default 'active' check (status in ('active','past_due','cancelled','trialing')),
  current_period_start  timestamptz not null default now(),
  current_period_end    timestamptz not null default (now() + interval '3 days'),
  created_at            timestamptz default now()
);

alter table subscriptions enable row level security;

create policy "subs_select" on subscriptions
  for select using (organization_id = get_user_organization_id());

create policy "subs_insert" on subscriptions
  for insert with check (organization_id = get_user_organization_id());

create policy "subs_update" on subscriptions
  for update using (organization_id = get_user_organization_id());

-- ── documents ────────────────────────────────────────────────
create table documents (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  uploaded_by       uuid not null references auth.users(id),
  storage_path      text not null,
  original_filename text not null,
  file_type         text not null,
  file_size_bytes   integer not null,
  status            text default 'pending' check (status in ('pending','processing','done','error')),
  raw_extraction    jsonb,
  edited_fields     jsonb,
  extraction_error  text,
  extracted_at      timestamptz,
  finalized_at      timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

alter table documents enable row level security;

create policy "docs_select" on documents
  for select using (organization_id = get_user_organization_id());

create policy "docs_insert" on documents
  for insert with check (organization_id = get_user_organization_id());

create policy "docs_update" on documents
  for update using (organization_id = get_user_organization_id());

create policy "docs_delete" on documents
  for delete using (organization_id = get_user_organization_id());

create index documents_org_idx on documents(organization_id, created_at desc);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger documents_updated_at
  before update on documents
  for each row execute function set_updated_at();

-- ── usage_logs ───────────────────────────────────────────────
create table usage_logs (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  document_id           uuid references documents(id) on delete set null,
  billing_period_start  timestamptz not null,
  created_at            timestamptz default now()
);

alter table usage_logs enable row level security;

create policy "usage_select" on usage_logs
  for select using (organization_id = get_user_organization_id());

create policy "usage_insert" on usage_logs
  for insert with check (organization_id = get_user_organization_id());

create index usage_logs_org_period_idx on usage_logs(organization_id, billing_period_start);

-- ── rate_limit_windows ───────────────────────────────────────
-- Accessed only via service-role key; no user-facing RLS needed
create table rate_limit_windows (
  key           text primary key,
  count         integer default 0,
  window_start  timestamptz default now()
);
