# Fix for NULL Client in Shifts

## Problem
Some shifts in the database have `client_id = NULL`, which causes them to not appear in the calendar when filtering by client.

## Solution

### 1. Execute the SQL migration to fix existing shifts:

Run this SQL in your Supabase SQL Editor:

```sql
-- Fix NULL client_id in shifts table by assigning them to Alexis Lysenko
WITH alexis_id AS (
  SELECT id FROM clients 
  WHERE first_name = 'Alexis' AND last_name = 'Lysenko'
  LIMIT 1
)
UPDATE shifts 
SET client_id = (SELECT id FROM alexis_id)
WHERE client_id IS NULL;
```

### 2. Add database constraint (optional but recommended):

This prevents NULL client_id from being saved in the future:

```sql
ALTER TABLE shifts 
ALTER COLUMN client_id SET NOT NULL;
```

### 3. Form validation (already implemented)

The calendar form already has validation that prevents creating shifts without a client:

```typescript
const clientForShift = newShift.client_id ?? selectedClientId
if (!clientForShift) {
  setError('Please select a client from the dropdown menu at the top of the page')
  return
}
```

## Steps to Apply:

1. Log in to Supabase dashboard
2. Go to SQL Editor
3. Create a new query
4. Copy and paste the SQL migration above
5. Click "Run"
6. Verify that shifts now show up in the calendar

## Verification:

After running the migration, all shifts should appear in the calendar view and the "Not assigned" client value should be gone.
