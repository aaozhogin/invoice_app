# Setup Invoices Table

The invoices table needs to be created in your Supabase database to store generated invoice records.

## Steps to Create the Invoices Table:

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project (the one with URL: `https://nnhlaceytkfyvqppzgle.supabase.co`)
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query** button
5. Copy and paste the following SQL code:

```sql
-- Create invoices table to store generated invoice records
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  carer_id integer NOT NULL REFERENCES carers(id) ON DELETE CASCADE,
  client_id integer NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date_from date NOT NULL,
  date_to date NOT NULL,
  invoice_date date NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_carer_id_idx ON invoices(carer_id);
CREATE INDEX IF NOT EXISTS invoices_client_id_idx ON invoices(client_id);
CREATE INDEX IF NOT EXISTS invoices_invoice_number_idx ON invoices(invoice_number);
```

6. Click **Run** button (or press Cmd+Enter)
7. You should see a success message "Query executed successfully"

After running this query, the invoices page will start showing generated invoices properly.

## Need to Enable RLS (Row Level Security)?

By default, Supabase has RLS disabled for new tables, which is fine for this app since we're using the anon key. If you see permission errors, you might need to enable RLS and add policies. But this should work as-is.

## Verify the Table was Created

To verify the table was created:
1. Click on **Table Editor** in the left sidebar
2. You should see an `invoices` table in the list
3. Click on it to see the table structure
