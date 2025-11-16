-- Add missing client_id column to shifts table
ALTER TABLE public.shifts 
ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS shifts_client_id_idx ON public.shifts (client_id);