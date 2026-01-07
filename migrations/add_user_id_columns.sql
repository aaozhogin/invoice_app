-- Add user_id column to all tables for multi-tenancy
-- This enables each user to have their own isolated data

-- Add user_id to shifts table
ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to carers table
ALTER TABLE carers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to line_items table
ALTER TABLE line_items 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to invoices table (if exists)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to saved_calendars table (if exists)
ALTER TABLE saved_calendars 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS shifts_user_id_idx ON shifts(user_id);
CREATE INDEX IF NOT EXISTS carers_user_id_idx ON carers(user_id);
CREATE INDEX IF NOT EXISTS clients_user_id_idx ON clients(user_id);
CREATE INDEX IF NOT EXISTS line_items_user_id_idx ON line_items(user_id);
CREATE INDEX IF NOT EXISTS invoices_user_id_idx ON invoices(user_id);
CREATE INDEX IF NOT EXISTS saved_calendars_user_id_idx ON saved_calendars(user_id);
