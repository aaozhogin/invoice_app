-- Create invoices table to store generated invoice records
CREATE TABLE invoices (
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
CREATE INDEX invoices_created_at_idx ON invoices(created_at DESC);
CREATE INDEX invoices_carer_id_idx ON invoices(carer_id);
CREATE INDEX invoices_client_id_idx ON invoices(client_id);
CREATE INDEX invoices_invoice_number_idx ON invoices(invoice_number);
