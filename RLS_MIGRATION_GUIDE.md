# Critical: RLS Security Enforcement - Step by Step Guide

## ⚠️ SECURITY ISSUE - URGENT
New user accounts can currently see data from other users because Row Level Security (RLS) policies have not been enforced. You must complete these steps immediately.

## What's Happening
1. The app allows login and signup ✅
2. But RLS policies aren't enforced yet ❌
3. New users can see ALL data instead of just their own

## Solution Overview
We need to execute 3 SQL migration scripts in Supabase in this order:
1. **add_user_id_columns.sql** - Adds user_id columns to all tables
2. **update_rls_policies_for_users.sql** - Creates RLS policies that enforce user isolation
3. **migrate_existing_data.sql** - Assigns existing data to aaozhogin@gmail.com user

---

## Step 1: Get the UUID of aaozhogin@gmail.com

**✅ ALREADY DONE - Your UUID is:**
```
593c00f8-87f1-4123-aab8-d70fdfa80099
```

This UUID has been automatically added to the migration scripts below.

---

## Step 2: Execute add_user_id_columns.sql

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **+ New Query**
3. Copy the entire contents of `/migrations/add_user_id_columns.sql`
4. Paste into the SQL editor
5. Click **Run** (or press Cmd+Enter)
6. You should see messages like:
   ```
   ALTER TABLE
   CREATE INDEX
   ```
7. ✅ Confirm all commands executed successfully (no errors in red)

---

## Step 3: Execute update_rls_policies_for_users.sql

1. In Supabase SQL Editor, click **+ New Query**
2. Copy the entire contents of `/migrations/update_rls_policies_for_users.sql`
3. Paste into the SQL editor
4. Click **Run**
5. You should see many `CREATE POLICY` messages
6. ✅ Confirm all executed successfully

---

## Step 4: Execute migrate_existing_data.sql

✅ **UUID is already substituted in the migration file!**

1. In Supabase SQL Editor, click **+ New Query**
2. Copy the entire contents of `/migrations/migrate_existing_data.sql`
   - The UUID `593c00f8-87f1-4123-aab8-d70fdfa80099` is already in place
3. Paste into the SQL editor
4. Click **Run**
5. You should see messages like:
   ```
   UPDATE 50  (meaning 50 shifts were updated)
   UPDATE 10  (meaning 10 carers were updated)
   etc.
   ```
6. ✅ Confirm all executed successfully

---

## Step 5: Verify RLS is Working

1. **Test with aaozhogin@gmail.com:**
   - Go to https://ndisapp.onmanylevels.com
   - Login: `aaozhogin@gmail.com` / `Miami2014`
   - You should see all your shifts ✅
   - Logout

2. **Test with new account:**
   - Create a new account (e.g., `test@example.com`)
   - Verify email
   - Go to Calendar
   - You should see **NO data** (blank calendar) ✅
   - Create a new shift for this user
   - You should only see YOUR own shift, not aaozhogin@gmail.com's data ✅

---

## Step 6: Configure Supabase URL Settings

1. In Supabase, go to **Authentication → Settings** (left sidebar)
2. Scroll to **URL Configuration**
3. Set:
   - **Site URL:** `https://ndisapp.onmanylevels.com`
   - **Redirect URLs:** 
     - `https://ndisapp.onmanylevels.com/auth/callback`
     - `https://ndisapp.onmanylevels.com`
4. Click **Save**

---

## Troubleshooting

### "Error: user_id column already exists"
- This is fine! It means the column was already added
- Continue to Step 3

### "Error: policy already exists"
- Drop the old policy first:
  ```sql
  DROP POLICY IF EXISTS "Users can view own shifts" ON shifts;
  ```
- Then create the new one

### New users still see old data after migration
- **Verify:** Check that the migration script actually ran and updated rows
  ```sql
  SELECT COUNT(*) FROM shifts WHERE user_id IS NOT NULL;
  ```
  Should show > 0
- If it shows 0, the USER_ID wasn't substituted correctly
- Re-run Step 4 with correct UUID

### RLS policies don't seem to be enforced
- Verify RLS is enabled on the tables:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables 
  WHERE tablename IN ('shifts', 'carers', 'clients', 'line_items', 'invoices', 'saved_calendars');
  ```
  Should show `rowsecurity = true` for all tables

---

## Complete - Your app is now secure! 🔒

Once verified:
- ✅ Each user sees only their own data
- ✅ New accounts start with zero data
- ✅ Data is completely isolated per user
- ✅ RLS enforces this at the database level (cannot be bypassed)
