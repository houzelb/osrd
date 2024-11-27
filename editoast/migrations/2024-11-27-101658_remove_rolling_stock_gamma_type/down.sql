ALTER TABLE rolling_stock
RENAME COLUMN const_gamma TO gamma;

ALTER TABLE rolling_stock
ALTER COLUMN gamma SET DATA TYPE jsonb USING json_object('type' : 'CONST', 'value' : gamma);


ALTER TABLE towed_rolling_stock
RENAME COLUMN const_gamma TO gamma;

ALTER TABLE towed_rolling_stock
ALTER COLUMN gamma SET DATA TYPE jsonb USING json_object('type' : 'CONST', 'value' : gamma);
