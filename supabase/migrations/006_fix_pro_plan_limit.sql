-- ============================================================
-- 006_fix_pro_plan_limit.sql — Update Pro plan limit to 200
-- ============================================================

UPDATE subscription_plans
SET document_limit = 200
WHERE id = 'pro';
