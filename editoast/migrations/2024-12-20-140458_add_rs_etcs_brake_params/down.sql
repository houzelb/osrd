-- Remove etcs_brake_params columns from rolling stock tables
ALTER TABLE rolling_stock
DROP COLUMN IF EXISTS etcs_brake_params;
