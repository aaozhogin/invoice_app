-- Add is_cost_overridden column to shifts table
ALTER TABLE shifts
ADD COLUMN is_cost_overridden BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX idx_shifts_is_cost_overridden ON shifts(is_cost_overridden);
