-- Add color column to carers table
-- This allows each carer to have a unique color for visual identification on the calendar

ALTER TABLE carers 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#22c55e';

-- Set default colors for existing carers (if any)
UPDATE carers 
SET color = '#22c55e'
WHERE color IS NULL;

-- Add constraint to ensure color is always provided
ALTER TABLE carers 
ADD CONSTRAINT carers_color_check 
CHECK (color IS NOT NULL AND color != '');