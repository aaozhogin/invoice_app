-- Add notes column to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster searches on notes if needed
CREATE INDEX IF NOT EXISTS idx_shifts_notes ON shifts USING gin(to_tsvector('english', notes));
