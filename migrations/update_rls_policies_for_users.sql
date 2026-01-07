-- Update RLS policies to enforce user data isolation
-- Each user can only see and modify their own data

-- DROP existing policies on shifts table
DROP POLICY IF EXISTS "Allow authenticated users to select shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to insert shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to update shifts" ON shifts;
DROP POLICY IF EXISTS "Allow authenticated users to delete shifts" ON shifts;

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
