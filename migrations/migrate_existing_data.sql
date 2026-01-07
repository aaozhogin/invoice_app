-- Migrate existing data to user account
-- This assigns all current data to the specified user (aaozhogin@gmail.com)
-- User UUID: 593c00f8-87f1-4123-aab8-d70fdfa80099

-- Update shifts
UPDATE shifts 
SET user_id = '593c00f8-87f1-4123-aab8-d70fdfa80099'::uuid
WHERE user_id IS NULL;

-- Update carers
UPDATE carers 
SET user_id = '593c00f8-87f1-4123-aab8-d70fdfa80099'::uuid
WHERE user_id IS NULL;

-- Update clients
UPDATE clients 
SET user_id = '593c00f8-87f1-4123-aab8-d70fdfa80099'::uuid
WHERE user_id IS NULL;

-- Update line_items
UPDATE line_items 
SET user_id = '593c00f8-87f1-4123-aab8-d70fdfa80099'::uuid
WHERE user_id IS NULL;

-- Update invoices (if exists)
UPDATE invoices 
SET user_id = '593c00f8-87f1-4123-aab8-d70fdfa80099'::uuid
WHERE user_id IS NULL;

-- Update saved_calendars (if exists)
UPDATE saved_calendars 
SET user_id = '593c00f8-87f1-4123-aab8-d70fdfa80099'::uuid
WHERE user_id IS NULL;
