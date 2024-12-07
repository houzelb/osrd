-- Add etcs_brake_params columns to rolling stock tables (default to NULL)
ALTER TABLE rolling_stock
ADD COLUMN IF NOT EXISTS etcs_brake_params jsonb NOT NULL DEFAULT 'null'::jsonb;
