-- Add google_event_id column to shifts table for Google Calendar sync
-- This stores the Google Calendar event ID for each shift

ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- Create an index for faster lookups when syncing
CREATE INDEX IF NOT EXISTS idx_shifts_google_event_id ON shifts(google_event_id);

-- Add last_synced_at timestamp to track when the shift was last synced
ALTER TABLE shifts
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
