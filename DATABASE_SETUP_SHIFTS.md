# Shifts Database Setup

This document describes the setup required for the Shifts table in Supabase.

## Table Schema

Create a table called `shifts` with the following columns:

```sql
-- Create the shifts table
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

-- Add helpful indexes
CREATE INDEX IF NOT EXISTS shifts_carer_id_idx ON public.shifts (carer_id);
CREATE INDEX IF NOT EXISTS shifts_line_item_code_id_idx ON public.shifts (line_item_code_id);
CREATE INDEX IF NOT EXISTS shifts_shift_date_idx ON public.shifts (shift_date);
CREATE INDEX IF NOT EXISTS shifts_time_range_idx ON public.shifts (time_from, time_to);

-- Add updated_at trigger
CREATE TRIGGER update_shifts_updated_at 
    BEFORE UPDATE ON public.shifts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraints
ALTER TABLE public.shifts ADD CONSTRAINT shifts_time_check 
    CHECK (time_to > time_from);
```

## Column Details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-incrementing unique identifier |
| `time_from` | TIMESTAMPTZ | NOT NULL | Shift start time with timezone |
| `time_to` | TIMESTAMPTZ | NOT NULL | Shift end time with timezone |
| `carer_id` | BIGINT | FK to carers(id) | Reference to the assigned carer |
| `line_item_code_id` | BIGINT | FK to line_items(id) | Reference to the line item code |
| `cost` | DECIMAL(10,2) | NOT NULL, DEFAULT 0.00 | Calculated cost for the shift |
| `shift_date` | DATE | NOT NULL | Date of the shift (for easy querying) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record last update timestamp |

## Relationships

- `carer_id` → `carers.id` (Foreign Key with CASCADE DELETE)
- `line_item_code_id` → `line_items.id` (Foreign Key with CASCADE DELETE)

## Row Level Security (RLS)

For development purposes, you may want to disable RLS initially:

```sql
-- Disable RLS for development (enable in production)
ALTER TABLE public.shifts DISABLE ROW LEVEL SECURITY;
```

For production, enable RLS and create appropriate policies:

```sql
-- Enable RLS
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Example policy for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON public.shifts
  FOR ALL USING (auth.role() = 'authenticated');
```

## Example Data

You can insert some test data:

```sql
INSERT INTO public.shifts (time_from, time_to, carer_id, line_item_code_id, cost, shift_date) VALUES
('2025-11-14 09:00:00+00', '2025-11-14 17:00:00+00', 1, 1, 561.84, '2025-11-14'),
('2025-11-14 20:00:00+00', '2025-11-15 08:00:00+00', 2, 2, 921.12, '2025-11-14');
```

## Verification

After setup, verify the table exists and is accessible:

```sql
-- Check table structure
\d public.shifts

-- Check if data can be inserted and queried
SELECT s.*, c.first_name, c.last_name, l.code, l.category 
FROM public.shifts s
JOIN public.carers c ON s.carer_id = c.id
JOIN public.line_items l ON s.line_item_code_id = l.id
ORDER BY s.shift_date, s.time_from;
```

## Notes

- The `time_from` and `time_to` use TIMESTAMPTZ for proper timezone handling
- The `shift_date` field helps with efficient date-based queries
- Foreign key constraints ensure data integrity
- The time check constraint ensures `time_to` is always after `time_from`
- Indexes are optimized for common query patterns (by carer, date, time ranges)