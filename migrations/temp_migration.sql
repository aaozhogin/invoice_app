-- Add color column to carers table if it doesn't exist
ALTER TABLE carers 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- Set default blue color for existing carers
UPDATE carers 
SET color = '#3b82f6'
WHERE color IS NULL OR color = '';