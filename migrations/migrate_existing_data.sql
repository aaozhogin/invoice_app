-- Migrate existing data to user account
-- This assigns all current data to the specified user (aaozhogin@gmail.com)
-- Run this AFTER the user account is created in Supabase Auth

-- Get the user_id for aaozhogin@gmail.com
-- Replace 'USER_ID_HERE' with the actual UUID from Supabase Auth after account creation

-- Update shifts
UPDATE shifts 
SET user_id = 'USER_ID_HERE'::uuid
WHERE user_id IS NULL;

-- Update carers
UPDATE carers 
SET user_id = 'USER_ID_HERE'::uuid
WHERE user_id IS NULL;

-- Update clients
UPDATE clients 
SET user_id = 'USER_ID_HERE'::uuid
WHERE user_id IS NULL;

-- Update line_items
UPDATE line_items 
SET user_id = 'USER_ID_HERE'::uuid
WHERE user_id IS NULL;

-- Update invoices (if exists)
UPDATE invoices 
SET user_id = 'USER_ID_HERE'::uuid
WHERE user_id IS NULL;

-- Update saved_calendars (if exists)
UPDATE saved_calendars 
SET user_id = 'USER_ID_HERE'::uuid
WHERE user_id IS NULL;
