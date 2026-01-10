-- Create shared_reports table for storing shareable report links
CREATE TABLE IF NOT EXISTS shared_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL,
  carers_report boolean DEFAULT false,
  line_items_report boolean DEFAULT false,
  categories_report boolean DEFAULT false,
  date_from date NOT NULL,
  date_to date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  access_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone,
  is_active boolean DEFAULT true
);

-- Create index on share_token for fast lookups
CREATE INDEX IF NOT EXISTS idx_shared_reports_token ON shared_reports(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_reports_user ON shared_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_reports_active ON shared_reports(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view only their own shared reports
CREATE POLICY shared_reports_view_policy ON shared_reports
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own shared reports
CREATE POLICY shared_reports_insert_policy ON shared_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own shared reports
CREATE POLICY shared_reports_update_policy ON shared_reports
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own shared reports
CREATE POLICY shared_reports_delete_policy ON shared_reports
  FOR DELETE USING (auth.uid() = user_id);
