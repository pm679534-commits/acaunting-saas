-- ============================================================
-- 005_atomic_document_limit.sql — Atomic document limit enforcement
-- ============================================================
-- Replaces the non-atomic trigger-based approach with a stored procedure
-- that uses row-level locking (SELECT FOR UPDATE) to prevent race conditions.
-- ============================================================

-- Drop the old trigger-based approach
drop trigger if exists enforce_document_limit on documents;
drop function if exists check_document_limit();

-- Atomic function to check limit and insert document
-- Uses SELECT FOR UPDATE on organizations table to create a serialization point
create or replace function check_and_insert_document(
  p_organization_id uuid,
  p_uploaded_by uuid,
  p_storage_path text,
  p_original_filename text,
  p_file_type text,
  p_file_size_bytes bigint
)
returns table(doc_id uuid, limit_exceeded boolean, current_usage integer, monthly_limit integer)
language plpgsql
security definer
as $$
declare
  v_plan_limit integer;
  v_period_start timestamptz;
  v_current_count integer;
  v_new_doc_id uuid;
begin
  -- Lock the organization row to serialize concurrent uploads
  -- This creates a transaction-level mutex per organization
  perform 1 from organizations where id = p_organization_id for update;

  -- Get active subscription and plan limit
  select sp.document_limit, s.current_period_start
  into v_plan_limit, v_period_start
  from subscriptions s
  join subscription_plans sp on s.plan_id = sp.id
  where s.organization_id = p_organization_id
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
  where organization_id = p_organization_id
    and created_at >= v_period_start;

  -- Check if limit exceeded
  if v_current_count >= v_plan_limit then
    -- Return failure without inserting
    return query select null::uuid, true, v_current_count, v_plan_limit;
    return;
  end if;

  -- Limit OK — insert the document
  insert into documents (
    organization_id,
    uploaded_by,
    storage_path,
    original_filename,
    file_type,
    file_size_bytes,
    status
  )
  values (
    p_organization_id,
    p_uploaded_by,
    p_storage_path,
    p_original_filename,
    p_file_type,
    p_file_size_bytes,
    'pending'
  )
  returning id into v_new_doc_id;

  -- Return success
  return query select v_new_doc_id, false, v_current_count + 1, v_plan_limit;
end;
$$;

comment on function check_and_insert_document is 'Atomically checks monthly document limit and inserts document. Uses row-level locking to prevent race conditions. Returns (doc_id, limit_exceeded, current_usage, monthly_limit).';
