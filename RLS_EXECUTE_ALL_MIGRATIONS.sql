-- ============================================================================
-- CRITICAL SECURITY: RLS Data Isolation - Execute All Migrations
-- ============================================================================
-- User: aaozhogin@gmail.com
-- UUID: 593c00f8-87f1-4123-aab8-d70fdfa80099
-- 
-- IMPORTANT: Execute this ENTIRE script in one go OR execute each section
-- separately in the Supabase SQL Editor in the order shown.
-- ============================================================================

-- ============================================================================
-- STEP 1: Add user_id columns to all tables
-- ============================================================================

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

-- ============================================================================
-- STEP 2: Update RLS Policies - Enforce User Data Isolation
-- ============================================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE carers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_calendars ENABLE ROW LEVEL SECURITY;

-- DROP existing policies on shifts table
DROP POLICY IF EXISTS "Allow authenticated users to select shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to insert shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to update shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to delete shifts" ON shifts;
-- Also drop any previously created user-scoped policies to make this idempotent
DROP POLICY IF EXISTS "Users can view own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can insert own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can update own shifts" ON shifts;
DROP POLICY IF EXISTS "Users can delete own shifts" ON shifts;

-- CREATE new user-specific policies for shifts
CREATE POLICY "Users can view own shifts"
  ON shifts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shifts"
  ON shifts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shifts"
  ON shifts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shifts"
  ON shifts FOR DELETE
  USING (auth.uid() = user_id);

-- DROP existing policies on carers table
DROP POLICY IF EXISTS "Allow authenticated users to select carers" ON carers;
DROP POLICY IF EXISTS "Allow authenticated users to insert carers" ON carers;
DROP POLICY IF EXISTS "Allow authenticated users to update carers" ON carers;
DROP POLICY IF EXISTS "Allow authenticated users to delete carers" ON carers;
-- Also drop any previously created user-scoped policies to make this idempotent
DROP POLICY IF EXISTS "Users can view own carers" ON carers;
DROP POLICY IF EXISTS "Users can insert own carers" ON carers;
DROP POLICY IF EXISTS "Users can update own carers" ON carers;
DROP POLICY IF EXISTS "Users can delete own carers" ON carers;

-- CREATE new user-specific policies for carers
CREATE POLICY "Users can view own carers"
  ON carers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own carers"
  ON carers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own carers"
  ON carers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own carers"
  ON carers FOR DELETE
  USING (auth.uid() = user_id);

-- DROP existing policies on clients table
DROP POLICY IF EXISTS "Allow authenticated users to select clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to insert clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to update clients" ON clients;
DROP POLICY IF EXISTS "Allow authenticated users to delete clients" ON clients;
-- Also drop any previously created user-scoped policies to make this idempotent
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

-- CREATE new user-specific policies for clients
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- DROP existing policies on line_items table
DROP POLICY IF EXISTS "Allow authenticated users to select line_items" ON line_items;
DROP POLICY IF EXISTS "Allow authenticated users to insert line_items" ON line_items;
DROP POLICY IF EXISTS "Allow authenticated users to update line_items" ON line_items;
DROP POLICY IF EXISTS "Allow authenticated users to delete line_items" ON line_items;
-- Also drop any previously created user-scoped policies to make this idempotent
DROP POLICY IF EXISTS "Users can view own line_items" ON line_items;
DROP POLICY IF EXISTS "Users can insert own line_items" ON line_items;
DROP POLICY IF EXISTS "Users can update own line_items" ON line_items;
DROP POLICY IF EXISTS "Users can delete own line_items" ON line_items;

-- CREATE new user-specific policies for line_items
CREATE POLICY "Users can view own line_items"
  ON line_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own line_items"
  ON line_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own line_items"
  ON line_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own line_items"
  ON line_items FOR DELETE
  USING (auth.uid() = user_id);

-- DROP existing policies on invoices table (if exists)
DROP POLICY IF EXISTS "Allow authenticated users to select invoices" ON invoices;
DROP POLICY IF EXISTS "Allow authenticated users to insert invoices" ON invoices;
DROP POLICY IF EXISTS "Allow authenticated users to update invoices" ON invoices;
DROP POLICY IF EXISTS "Allow authenticated users to delete invoices" ON invoices;
-- Also drop any previously created user-scoped policies to make this idempotent
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;

-- CREATE new user-specific policies for invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- DROP existing policies on saved_calendars table (if exists)
DROP POLICY IF EXISTS "Allow authenticated users to select saved_calendars" ON saved_calendars;
DROP POLICY IF EXISTS "Allow authenticated users to insert saved_calendars" ON saved_calendars;
DROP POLICY IF EXISTS "Allow authenticated users to update saved_calendars" ON saved_calendars;
DROP POLICY IF EXISTS "Allow authenticated users to delete saved_calendars" ON saved_calendars;
-- Also drop any previously created user-scoped policies to make this idempotent
DROP POLICY IF EXISTS "Users can view own saved_calendars" ON saved_calendars;
DROP POLICY IF EXISTS "Users can insert own saved_calendars" ON saved_calendars;
DROP POLICY IF EXISTS "Users can update own saved_calendars" ON saved_calendars;
DROP POLICY IF EXISTS "Users can delete own saved_calendars" ON saved_calendars;

-- CREATE new user-specific policies for saved_calendars
CREATE POLICY "Users can view own saved_calendars"
  ON saved_calendars FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved_calendars"
  ON saved_calendars FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved_calendars"
  ON saved_calendars FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved_calendars"
  ON saved_calendars FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 3: Migrate Existing Data to aaozhogin@gmail.com
-- ============================================================================

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

-- ============================================================================
-- VERIFICATION QUERIES (Run these after all migrations to confirm success)
-- ============================================================================
-- 
-- Verify user_id columns exist:
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name IN ('shifts', 'carers', 'clients', 'line_items', 'invoices', 'saved_calendars') 
-- AND column_name = 'user_id';
--
-- Verify data was migrated:
-- SELECT 'shifts' as table_name, COUNT(*) as rows_with_user_id FROM shifts WHERE user_id IS NOT NULL
-- UNION ALL
-- SELECT 'carers', COUNT(*) FROM carers WHERE user_id IS NOT NULL
-- UNION ALL
-- SELECT 'clients', COUNT(*) FROM clients WHERE user_id IS NOT NULL
-- UNION ALL
-- SELECT 'line_items', COUNT(*) FROM line_items WHERE user_id IS NOT NULL;
--
-- Verify RLS policies exist:
-- SELECT schemaname, tablename, policyname FROM pg_policies 
-- WHERE tablename IN ('shifts', 'carers', 'clients', 'line_items', 'invoices', 'saved_calendars');
--
-- ============================================================================
-- ALL MIGRATIONS COMPLETE! 🔒
-- ============================================================================
