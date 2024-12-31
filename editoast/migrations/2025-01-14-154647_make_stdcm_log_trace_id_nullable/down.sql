UPDATE stdcm_logs
SET trace_id = REPLACE(gen_random_uuid()::text, '-', '')
WHERE trace_id IS NULL;

ALTER TABLE stdcm_logs ALTER COLUMN trace_id SET NOT NULL;
