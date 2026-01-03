-- Create line_item_categories table
CREATE TABLE IF NOT EXISTS line_item_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_line_item_categories_name ON line_item_categories(name);

-- Insert existing categories
INSERT INTO line_item_categories (name) VALUES 
  ('CORE'),
  ('Home and Living'),
  ('Access Community Social and Rec Activities'),
  ('HIREUP')
ON CONFLICT (name) DO NOTHING;
