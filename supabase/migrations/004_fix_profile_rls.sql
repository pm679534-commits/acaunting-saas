-- ============================================================
-- 004_fix_profile_rls.sql — Fix profile RLS policies
-- ============================================================

-- Drop the problematic separate admin policy
drop policy if exists "profiles_select_admin" on profiles;

-- Update the main select policy to include admin access
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (
    id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and is_platform_admin = true)
  );
