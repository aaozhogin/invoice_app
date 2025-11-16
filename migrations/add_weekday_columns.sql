-- Add weekday filtering columns to line_items table
-- Run this migration to add support for weekday-specific line item codes

ALTER TABLE line_items 
ADD COLUMN IF NOT EXISTS weekday BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS saturday BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sunday BOOLEAN DEFAULT FALSE;

-- Set default values for existing records (assume weekday = true for existing records)
UPDATE line_items 
SET weekday = TRUE 
WHERE weekday IS FALSE AND saturday IS FALSE AND sunday IS FALSE;

-- Add constraint to ensure only one day type is selected
ALTER TABLE line_items 
ADD CONSTRAINT check_single_day_type 
CHECK ((weekday::int + saturday::int + sunday::int) = 1);

-- Create index for efficient filtering by day type
CREATE INDEX IF NOT EXISTS line_items_weekday_idx ON line_items (weekday) WHERE weekday = TRUE;
CREATE INDEX IF NOT EXISTS line_items_saturday_idx ON line_items (saturday) WHERE saturday = TRUE;
CREATE INDEX IF NOT EXISTS line_items_sunday_idx ON line_items (sunday) WHERE sunday = TRUE;