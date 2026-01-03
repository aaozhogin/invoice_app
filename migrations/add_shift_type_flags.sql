-- Add shift type flags to shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS is_sleepover BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_public_holiday BOOLEAN DEFAULT false;

-- Add index for querying shifts by type
CREATE INDEX IF NOT EXISTS idx_shifts_is_sleepover ON shifts(is_sleepover);
CREATE INDEX IF NOT EXISTS idx_shifts_is_public_holiday ON shifts(is_public_holiday);
