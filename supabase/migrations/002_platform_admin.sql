-- ============================================================
-- 002_platform_admin.sql — Add platform admin capabilities
-- ============================================================

-- Add is_platform_admin column to profiles
alter table profiles add column is_platform_admin boolean default false not null;

-- Update RLS policies to allow platform admins full access

-- organizations: platform admins can see all orgs
drop policy if exists "org_select" on organizations;
create policy "org_select" on organizations
  for select using (
    id = get_user_organization_id()
    or exists (select 1 from profiles where id = auth.uid() and is_platform_admin = true)
  );

drop policy if exists "org_update" on organizations;
create policy "org_update" on organizations
  for update using (
    id = get_user_organization_id()
    or exists (select 1 from profiles where id = auth.uid() and is_platform_admin = true)
  );

-- profiles: platform admins can see all profiles
create policy "profiles_select_admin" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_platform_admin = true)
  );

-- documents: platform admins can see all documents
create policy "docs_select_admin" on documents
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_platform_admin = true)
  );

create policy "docs_update_admin" on documents
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_platform_admin = true)
  );

create policy "docs_delete_admin" on documents
  for delete using (
    exists (select 1 from profiles where id = auth.uid() and is_platform_admin = true)
  );

-- subscriptions: platform admins can see all subscriptions
create policy "subs_select_admin" on subscriptions
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_platform_admin = true)
  );

create policy "subs_update_admin" on subscriptions
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_platform_admin = true)
  );

-- usage_logs: platform admins can see all usage
create policy "usage_select_admin" on usage_logs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_platform_admin = true)
  );

-- ============================================================
-- ONE-TIME SQL to set earliest user as platform admin
-- RUN THIS MANUALLY in Supabase SQL editor:
-- ============================================================
-- update profiles
-- set is_platform_admin = true
-- where id = (select id from profiles order by created_at asc limit 1);
-- ============================================================
