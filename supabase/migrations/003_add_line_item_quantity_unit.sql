-- ============================================================
-- 003_add_line_item_quantity_unit.sql — Add quantity and unit to line items
-- ============================================================

alter table document_line_items add column quantity numeric;
alter table document_line_items add column unit text;
