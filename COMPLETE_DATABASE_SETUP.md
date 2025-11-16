# Complete Database Setup for Invoice App

This script will create all required tables for the Invoice App with proper relationships.

## Run in Supabase SQL Editor

Copy and paste the following SQL commands in your Supabase SQL Editor:

```sql
-- Create update function first (used by multiple tables)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. CREATE CARERS TABLE
CREATE TABLE IF NOT EXISTS public.carers (
    id BIGSERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    abn TEXT NOT NULL,
    account_name TEXT NOT NULL,
    bsb TEXT NOT NULL CHECK (bsb ~ '^\d{6}$'), -- Exactly 6 digits
    account_number TEXT NOT NULL CHECK (account_number ~ '^\d+$'), -- Only digits
    logo_url TEXT, -- Optional logo image URL
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add carers constraints
ALTER TABLE public.carers 
ADD CONSTRAINT IF NOT EXISTS carers_email_check 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.carers 
ADD CONSTRAINT IF NOT EXISTS carers_phone_check 
CHECK (phone_number ~ '^[0-9+\s\-()]+$');

ALTER TABLE public.carers 
ADD CONSTRAINT IF NOT EXISTS carers_abn_check 
CHECK (abn ~ '^[0-9\s]+$');

-- Carers trigger
DROP TRIGGER IF EXISTS update_carers_updated_at ON public.carers;
CREATE TRIGGER update_carers_updated_at 
    BEFORE UPDATE ON public.carers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. CREATE CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  ndis_number BIGINT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients indexes
CREATE INDEX IF NOT EXISTS clients_ndis_number_idx ON public.clients (ndis_number);
CREATE INDEX IF NOT EXISTS clients_name_idx ON public.clients (first_name, last_name);

-- Clients trigger
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON public.clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. CREATE LINE_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.line_items (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'Services',
  description TEXT NOT NULL,
  time_start TIME,
  time_end TIME,
  weekend_loading BOOLEAN DEFAULT false,
  billed_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  pay_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Line items indexes
CREATE INDEX IF NOT EXISTS line_items_category_idx ON public.line_items (category);
CREATE INDEX IF NOT EXISTS line_items_rate_idx ON public.line_items (billed_rate);

-- Line items trigger
DROP TRIGGER IF EXISTS update_line_items_updated_at ON public.line_items;
CREATE TRIGGER update_line_items_updated_at 
    BEFORE UPDATE ON public.line_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. CREATE SHIFTS TABLE (depends on carers and line_items)
CREATE TABLE IF NOT EXISTS public.shifts (
  id BIGSERIAL PRIMARY KEY,
  time_from TIMESTAMPTZ NOT NULL,
  time_to TIMESTAMPTZ NOT NULL,
  carer_id BIGINT REFERENCES public.carers(id) ON DELETE CASCADE,
  line_item_code_id BIGINT REFERENCES public.line_items(id) ON DELETE CASCADE,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shift_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts indexes
CREATE INDEX IF NOT EXISTS shifts_carer_id_idx ON public.shifts (carer_id);
CREATE INDEX IF NOT EXISTS shifts_line_item_code_id_idx ON public.shifts (line_item_code_id);
CREATE INDEX IF NOT EXISTS shifts_shift_date_idx ON public.shifts (shift_date);
CREATE INDEX IF NOT EXISTS shifts_time_range_idx ON public.shifts (time_from, time_to);

-- Shifts constraints
ALTER TABLE public.shifts ADD CONSTRAINT IF NOT EXISTS shifts_time_check 
    CHECK (time_to > time_from);

-- Shifts trigger
DROP TRIGGER IF EXISTS update_shifts_updated_at ON public.shifts;
CREATE TRIGGER update_shifts_updated_at 
    BEFORE UPDATE ON public.shifts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. INSERT SAMPLE DATA
-- Sample Carers
INSERT INTO public.carers (first_name, last_name, address, phone_number, email, abn, account_name, bsb, account_number) 
VALUES 
  ('John', 'Smith', '123 Main St, Sydney NSW 2000', '+61 412 345 678', 'john.smith@email.com', '12 345 678 901', 'John Smith', '123456', '987654321'),
  ('Sarah', 'Johnson', '456 Oak Ave, Melbourne VIC 3000', '+61 423 456 789', 'sarah.j@email.com', '23 456 789 012', 'Sarah Johnson', '234567', '876543210'),
  ('Michael', 'Brown', '789 Pine Rd, Brisbane QLD 4000', '+61 434 567 890', 'mike.brown@email.com', '34 567 890 123', 'Michael Brown', '345678', '765432109')
ON CONFLICT DO NOTHING;

-- Sample Line Items
INSERT INTO public.line_items (category, description, time_start, time_end, weekend_loading, billed_rate, pay_rate)
VALUES
  ('Personal Care', 'Assist with personal hygiene', '06:00:00', '22:00:00', false, 85.50, 65.00),
  ('Transport', 'Community access transport', '08:00:00', '18:00:00', true, 95.75, 72.50),
  ('Household Tasks', 'Domestic assistance', '07:00:00', '19:00:00', false, 78.25, 58.75),
  ('Social Support', 'Community participation', '09:00:00', '17:00:00', true, 88.90, 68.25),
  ('Nursing Care', 'Clinical nursing support', '24:00:00', '23:59:59', false, 125.50, 95.00)
ON CONFLICT DO NOTHING;

-- Sample Clients
INSERT INTO public.clients (first_name, last_name, ndis_number, address)
VALUES
  ('Emma', 'Wilson', 1234567890, '321 Client St, Sydney NSW 2001'),
  ('David', 'Taylor', 2345678901, '654 Hope Ave, Melbourne VIC 3001'),
  ('Lisa', 'Anderson', 3456789012, '987 Care Rd, Brisbane QLD 4001')
ON CONFLICT DO NOTHING;
```

## Verification Queries

After running the setup, verify tables are created correctly:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('carers', 'clients', 'line_items', 'shifts');

-- Check sample data
SELECT COUNT(*) as carer_count FROM public.carers;
SELECT COUNT(*) as line_item_count FROM public.line_items;
SELECT COUNT(*) as client_count FROM public.clients;

-- Check foreign key relationships
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM 
  information_schema.table_constraints AS tc 
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'shifts';
```

## Row Level Security (Optional)

If you want to enable RLS:

```sql
-- Enable RLS on all tables
ALTER TABLE public.carers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users" ON public.carers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON public.clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON public.line_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users" ON public.shifts FOR ALL TO authenticated USING (true);
```