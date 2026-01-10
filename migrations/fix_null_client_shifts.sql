-- Fix NULL client_id in shifts table by assigning them to Alexis Lysenko

-- First, find Alexis Lysenko's ID
WITH alexis_id AS (
  SELECT id FROM clients 
  WHERE first_name = 'Alexis' AND last_name = 'Lysenko'
  LIMIT 1
)
UPDATE shifts 
SET client_id = (SELECT id FROM alexis_id)
WHERE client_id IS NULL;
