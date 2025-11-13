# Clients Database Setup

This document describes the setup required for the Clients table in Supabase.

## Table Schema

Create a table called `clients` with the following columns:

```sql
-- Create the clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  ndis_number BIGINT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS clients_ndis_number_idx ON public.clients (ndis_number);
CREATE INDEX IF NOT EXISTS clients_name_idx ON public.clients (first_name, last_name);

-- Add updated_at trigger (optional)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON public.clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Column Details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-incrementing unique identifier |
| `first_name` | TEXT | NOT NULL | Client's first name |
| `last_name` | TEXT | NOT NULL | Client's last name |
| `ndis_number` | BIGINT | NOT NULL | Client's NDIS participant number |
| `address` | TEXT | NOT NULL, DEFAULT '' | Client's residential address |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record last update timestamp |

## Row Level Security (RLS)

For development purposes, you may want to disable RLS initially:

```sql
-- Disable RLS for development (enable in production)
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
```

For production, enable RLS and create appropriate policies:

```sql
-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Example policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON public.clients
  FOR ALL USING (auth.role() = 'authenticated');
```

## Example Data

You can insert some test data:

```sql
INSERT INTO public.clients (first_name, last_name, ndis_number, address) VALUES
('John', 'Smith', 4123456789, '123 Main St, Sydney NSW 2000'),
('Sarah', 'Johnson', 4987654321, '456 Oak Avenue, Melbourne VIC 3000'),
('Michael', 'Brown', 4555123456, '789 Elm Street, Brisbane QLD 4000');
```

## Verification

After setup, verify the table exists and is accessible:

```sql
-- Check table structure
\d public.clients

-- Check if data can be inserted and queried
SELECT * FROM public.clients ORDER BY id;
```

## Notes

- The `ndis_number` field uses BIGINT to handle large NDIS participant numbers
- The `address` field allows for full residential addresses
- Indexes on `ndis_number` and name fields help with search performance
- The `updated_at` trigger automatically tracks when records are modified