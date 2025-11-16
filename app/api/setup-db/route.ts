import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

// Database setup SQL
const setupSQL = `
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
    bsb TEXT NOT NULL CHECK (bsb ~ '^\\d{6}$'), -- Exactly 6 digits
    account_number TEXT NOT NULL CHECK (account_number ~ '^\\d+$'), -- Only digits
    logo_url TEXT, -- Optional logo image URL
    color TEXT DEFAULT '#3b82f6', -- Carer color for calendar display
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add color column to existing carers table
ALTER TABLE public.carers 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- Update existing carers without color
UPDATE public.carers 
SET color = '#3b82f6'
WHERE color IS NULL OR color = '';

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
  weekday BOOLEAN DEFAULT true,
  saturday BOOLEAN DEFAULT false,
  sunday BOOLEAN DEFAULT false,
  sleepover BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE SHIFTS TABLE
CREATE TABLE IF NOT EXISTS public.shifts (
  id BIGSERIAL PRIMARY KEY,
  time_from TIMESTAMPTZ NOT NULL,
  time_to TIMESTAMPTZ NOT NULL,
  carer_id BIGINT REFERENCES public.carers(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES public.clients(id) ON DELETE SET NULL,
  line_item_code_id BIGINT REFERENCES public.line_items(id) ON DELETE CASCADE,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  shift_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add client_id column to existing shifts table if it doesn't exist
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add constraint to ensure end time is after start time
ALTER TABLE public.shifts ADD CONSTRAINT IF NOT EXISTS shifts_time_check 
    CHECK (time_to > time_from);
`;

const sampleDataSQL = `
-- Sample Carers
INSERT INTO public.carers (first_name, last_name, address, phone_number, email, abn, account_name, bsb, account_number) 
VALUES 
  ('John', 'Smith', '123 Main St, Sydney NSW 2000', '+61 412 345 678', 'john.smith@email.com', '12 345 678 901', 'John Smith', '123456', '987654321'),
  ('Sarah', 'Johnson', '456 Oak Ave, Melbourne VIC 3000', '+61 423 456 789', 'sarah.j@email.com', '23 456 789 012', 'Sarah Johnson', '234567', '876543210'),
  ('Michael', 'Brown', '789 Pine Rd, Brisbane QLD 4000', '+61 434 567 890', 'mike.brown@email.com', '34 567 890 123', 'Michael Brown', '345678', '765432109')
ON CONFLICT DO NOTHING;

-- Sample Line Items
INSERT INTO public.line_items (category, description, time_start, time_end, weekend_loading, billed_rate, pay_rate, weekday, saturday, sunday, sleepover)
VALUES
  ('Personal Care', 'Assist with personal hygiene', '06:00:00', '22:00:00', false, 85.50, 65.00, true, false, false, false),
  ('Transport', 'Community access transport', '08:00:00', '18:00:00', true, 95.75, 72.50, true, false, false, false),
  ('Household Tasks', 'Domestic assistance', '07:00:00', '19:00:00', false, 78.25, 58.75, true, false, false, false),
  ('Social Support', 'Community participation', '09:00:00', '17:00:00', true, 88.90, 68.25, true, false, false, false),
  ('Nursing Care', 'Clinical nursing support', '00:00:00', '23:59:59', false, 125.50, 95.00, true, true, true, false),
  ('Sleepover Support', 'Overnight sleepover assistance', '22:00:00', '06:00:00', false, 180.00, 120.00, true, true, true, true)
ON CONFLICT DO NOTHING;

-- Sample Clients
INSERT INTO public.clients (first_name, last_name, ndis_number, address)
VALUES
  ('Emma', 'Wilson', 1234567890, '321 Client St, Sydney NSW 2001'),
  ('David', 'Taylor', 2345678901, '654 Hope Ave, Melbourne VIC 3001'),
  ('Lisa', 'Anderson', 3456789012, '987 Care Rd, Brisbane QLD 4001')
ON CONFLICT DO NOTHING;
`;

export async function POST() {
  try {
    const supabase = getSupabaseClient()
    
    console.log('🚀 Starting database setup...')
    
    // Instead of running SQL, let's try to insert sample data directly
    // and see what tables exist
    
    // Test if carers table exists by trying to insert data
    console.log('📝 Testing carers table...')
    const { error: carersError } = await supabase.from('carers').insert([
      {
        first_name: 'John',
        last_name: 'Smith',
        address: '123 Main St, Sydney NSW 2000',
        phone_number: '+61 412 345 678',
        email: 'john.smith@email.com',
        abn: '12 345 678 901',
        account_name: 'John Smith',
        bsb: '123456',
        account_number: '987654321'
      }
    ]).select()
    
    console.log('Carers result:', { error: carersError })
    
    // Test if clients table exists
    console.log('📝 Testing clients table...')
    const { error: clientsError } = await supabase.from('clients').insert([
      {
        first_name: 'Emma',
        last_name: 'Wilson', 
        ndis_number: 1234567890,
        address: '321 Client St, Sydney NSW 2001'
      }
    ]).select()
    
    console.log('Clients result:', { error: clientsError })
    
    // Test if line_items table exists and what columns it has
    console.log('📝 Testing line_items table...')
    const { data: existingLineItems, error: lineItemsSelectError } = await supabase
      .from('line_items')
      .select('*')
      .limit(1)
    
    console.log('Existing line items:', { data: existingLineItems, error: lineItemsSelectError })
    
    // Try to insert a simple line item
    const { error: lineItemsError } = await supabase.from('line_items').insert([
      {
        category: 'Personal Care',
        description: 'Assist with personal hygiene',
        time_start: '06:00:00',
        time_end: '22:00:00',
        billed_rate: 85.50
      }
    ]).select()
    
    console.log('Line items insert result:', { error: lineItemsError })
    
    // Test shifts table
    console.log('📝 Testing shifts table...')
    const { data: existingShifts, error: shiftsSelectError } = await supabase
      .from('shifts')
      .select('*')
      .limit(1)
    
    console.log('Existing shifts:', { data: existingShifts, error: shiftsSelectError })
    
    return NextResponse.json({
      success: true,
      message: 'Database test completed',
      results: {
        carers: carersError ? `Error: ${carersError.message}` : 'OK',
        clients: clientsError ? `Error: ${clientsError.message}` : 'OK', 
        lineItems: lineItemsError ? `Error: ${lineItemsError.message}` : 'OK'
      }
    })
    
  } catch (error) {
    console.error('💥 Database setup failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to run database setup',
    usage: 'curl -X POST http://localhost:3000/api/setup-db'
  })
}