-- ============================================================
-- 004_enforce_document_limit.sql — Database-level document limit enforcement
-- ============================================================

-- Function to check document limit before insert
create or replace function check_document_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  v_subscription_id uuid;
  v_plan_limit integer;
  v_period_start timestamptz;
  v_current_count integer;
begin
  -- Get active subscription for this organization
  select s.id, sp.document_limit, s.current_period_start
  into v_subscription_id, v_plan_limit, v_period_start
  from subscriptions s
  join subscription_plans sp on s.plan_id = sp.id
  where s.organization_id = NEW.organization_id
    and s.status in ('active', 'trialing')
  order by s.created_at desc
  limit 1;

  -- Default to starter plan limit (5) if no subscription found
  if v_plan_limit is null then
    v_plan_limit := 5;
    v_period_start := '1970-01-01'::timestamptz;
  end if;

  -- Count existing documents in current billing period
  select count(*)
  into v_current_count
  from documents
  where organization_id = NEW.organization_id
    and created_at >= v_period_start;

  -- Reject if at or over limit
  if v_current_count >= v_plan_limit then
    raise exception 'DOCUMENT_LIMIT_EXCEEDED: Organization % has reached monthly document limit of % (current: %)',
      NEW.organization_id, v_plan_limit, v_current_count
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

-- Create trigger on documents table
drop trigger if exists enforce_document_limit on documents;
create trigger enforce_document_limit
  before insert on documents
  for each row
  execute function check_document_limit();

-- Add helpful comment
comment on function check_document_limit() is 'Enforces monthly document upload limit based on organization subscription plan. Called by trigger before document insert.';
