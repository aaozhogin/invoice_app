-- Add category column to shifts table to store HIREUP and other categories
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS category VARCHAR(255);

-- Add index for better query performance when filtering by category
CREATE INDEX IF NOT EXISTS idx_shifts_category ON shifts(category);

-- Update existing HIREUP shifts (those with null line_item_code_id and cost > 0)
-- Note: This is a best-effort migration. Manual review may be needed for existing data.
UPDATE shifts 
SET category = 'HIREUP' 
WHERE line_item_code_id IS NULL AND cost > 0;
