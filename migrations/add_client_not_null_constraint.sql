-- Add NOT NULL constraint to client_id column in shifts table
ALTER TABLE shifts 
ALTER COLUMN client_id SET NOT NULL;

-- Optional: Add a check constraint to ensure client_id exists in clients table
ALTER TABLE shifts 
ADD CONSTRAINT fk_shifts_client_id FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT;
