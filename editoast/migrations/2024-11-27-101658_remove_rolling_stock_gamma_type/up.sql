-- Remove rolling_stock.gamma.type
-- and rename rolling_stock.gamma.value to rolling_stock.const_gamma
ALTER TABLE rolling_stock
ALTER COLUMN gamma SET DATA TYPE float8 USING float8(gamma['value']);

ALTER TABLE rolling_stock
RENAME COLUMN gamma TO const_gamma;

-- Remove towed_rolling_stock.gamma.type
-- and rename towed_rolling_stock.gamma.value to towed_rolling_stock.const_gamma
ALTER TABLE towed_rolling_stock
ALTER COLUMN gamma SET DATA TYPE float8 USING float8(gamma['value']);

ALTER TABLE towed_rolling_stock
RENAME COLUMN gamma TO const_gamma;
