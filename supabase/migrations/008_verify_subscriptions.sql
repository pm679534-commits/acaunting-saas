-- ============================================================
-- 008_verify_subscriptions.sql — Diagnostic query to verify subscription data
-- ============================================================

-- Query to check all active subscriptions with their plans
SELECT
  s.id as subscription_id,
  s.organization_id,
  s.plan_id,
  s.status,
  sp.name as plan_name,
  sp.document_limit,
  s.current_period_start,
  s.current_period_end,
  s.created_at
FROM subscriptions s
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status IN ('active', 'trialing')
ORDER BY s.created_at DESC;

-- Verify subscription_plans table data
SELECT * FROM subscription_plans ORDER BY price_azn;
