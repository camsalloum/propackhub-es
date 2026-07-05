ALTER TABLE estimates ADD COLUMN IF NOT EXISTS tooling_scenario VARCHAR(16) DEFAULT 'new';
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS billable_color_count INTEGER;

UPDATE estimates SET tooling_scenario = 'new' WHERE tooling_scenario IS NULL;
