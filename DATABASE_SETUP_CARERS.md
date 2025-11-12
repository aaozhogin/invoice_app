# Database Setup Instructions for Carers Table

## SQL Script to Create CARERS Table

Run the following SQL commands in your Supabase SQL Editor:

```sql
-- Create the carers table
CREATE TABLE public.carers (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add email validation constraint
ALTER TABLE public.carers 
ADD CONSTRAINT carers_email_check 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add phone number validation (allows digits, +, spaces, hyphens, parentheses)
ALTER TABLE public.carers 
ADD CONSTRAINT carers_phone_check 
CHECK (phone_number ~ '^[0-9+\s\-()]+$');

-- Add ABN validation (numbers and spaces only)
ALTER TABLE public.carers 
ADD CONSTRAINT carers_abn_check 
CHECK (abn ~ '^[0-9\s]+$');

-- Create an updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_carers_updated_at 
    BEFORE UPDATE ON public.carers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.carers ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your authentication setup)
-- This policy allows all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON public.carers
FOR ALL USING (auth.role() = 'authenticated');

-- If you want to allow anonymous access (not recommended for production):
-- CREATE POLICY "Enable all operations for everyone" ON public.carers FOR ALL USING (true);

-- Grant necessary permissions
GRANT ALL ON public.carers TO authenticated;
GRANT ALL ON public.carers TO anon; -- Remove this line if you don't want anonymous access
```

## Storage Bucket Setup for Logo Images

If you haven't already set up file storage for logo images, run this in the SQL Editor:

```sql
-- Create a storage bucket for carer logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true);

-- Create policies for the uploads bucket
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'uploads');

CREATE POLICY "Allow authenticated users to delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'uploads');
```

## Environment Variables

Make sure your `.env.local` file contains:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Optional: Sample Data

To test the carers functionality, you can insert some sample data:

```sql
INSERT INTO public.carers (
    first_name, 
    last_name, 
    address, 
    phone_number, 
    email, 
    abn, 
    account_name, 
    bsb, 
    account_number
) VALUES 
(
    'John', 
    'Smith', 
    '123 Main Street, Sydney NSW 2000', 
    '+61 400 123 456', 
    'john.smith@email.com', 
    '12 345 678 901', 
    'John Smith', 
    '123456', 
    '987654321'
),
(
    'Sarah', 
    'Johnson', 
    '456 Oak Avenue, Melbourne VIC 3000', 
    '+61 411 987 654', 
    'sarah.johnson@email.com', 
    '98 765 432 109', 
    'Sarah Johnson', 
    '654321', 
    '123456789'
);
```

## Verification

After running the SQL commands, verify the table was created correctly:

```sql
-- Check table structure
\d public.carers;

-- Check constraints
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'public.carers'::regclass;

-- Test insert (should work)
INSERT INTO public.carers (first_name, last_name, address, phone_number, email, abn, account_name, bsb, account_number)
VALUES ('Test', 'User', '123 Test St', '+61 400 000 000', 'test@test.com', '12 345 678 901', 'Test User', '123456', '987654321');

-- Clean up test data
DELETE FROM public.carers WHERE email = 'test@test.com';
```

The carers table is now ready to use with the React application!