# Authentication System Deployment Guide

## Overview
This guide will help you deploy a complete multi-tenant authentication system with email verification and password recovery.

## Prerequisites
- Supabase project with active database
- Access to Supabase dashboard
- Email delivery configured in Supabase (or use default Supabase emails)

## Step 1: Run Database Migrations

### 1.1 Add user_id columns
In Supabase SQL Editor, run:
```sql
-- File: migrations/add_user_id_columns.sql
```
Copy and paste the contents of `migrations/add_user_id_columns.sql` and execute.

### 1.2 Update RLS Policies
In Supabase SQL Editor, run:
```sql
-- File: migrations/update_rls_policies_for_users.sql
```
Copy and paste the contents of `migrations/update_rls_policies_for_users.sql` and execute.

**IMPORTANT**: This will drop your existing simple policies and replace them with user-specific policies.

## Step 2: Enable Supabase Auth

### 2.1 Configure Email Provider (Optional)
Go to: Supabase Dashboard → Authentication → Settings → Email

For production, configure your own SMTP provider (SendGrid, AWS SES, etc.). For testing, you can use Supabase's default email service.

### 2.2 Configure Site URL
Go to: Supabase Dashboard → Authentication → Settings → URL Configuration

Set:
- Site URL: `https://ndisapp.onmanylevels.com`
- Redirect URLs: Add:
  - `https://ndisapp.onmanylevels.com/auth/callback`
  - `https://ndisapp.onmanylevels.com/auth/reset-password`
  - `http://localhost:3000/auth/callback` (for local dev)
  - `http://localhost:3000/auth/reset-password` (for local dev)

### 2.3 Enable Email Confirmation
Go to: Supabase Dashboard → Authentication → Settings → Email Auth

Enable:
- ✅ **Enable email confirmations** - Users must verify their email before logging in
- ✅ **Enable email change confirmations**
- ✅ **Secure email change**

## Step 3: Create the Primary User Account

### 3.1 Manual Account Creation
Option A - Via Supabase Dashboard:
1. Go to: Authentication → Users
2. Click "Add user" → "Create new user"
3. Email: `aaozhogin@gmail.com`
4. Password: `Miami2014`
5. Click "Create user"
6. **IMPORTANT**: Copy the user's UUID (you'll need this for the next step)
7. If email confirmation is enabled, verify the email via the link sent

Option B - Via Sign Up Page:
1. Deploy the app
2. Go to `/signup`
3. Sign up with `aaozhogin@gmail.com` / `Miami2014`
4. Verify email
5. Get the user UUID from Supabase Dashboard → Authentication → Users

### 3.2 Migrate Existing Data to User Account
In Supabase SQL Editor:
1. Open `migrations/migrate_existing_data.sql`
2. Replace `'USER_ID_HERE'` with the actual UUID from step 3.1
3. Execute the script

Example:
```sql
UPDATE shifts 
SET user_id = '12345678-1234-1234-1234-123456789012'::uuid
WHERE user_id IS NULL;
-- ... repeat for all tables
```

## Step 4: Deploy to Production

### 4.1 Commit and Push Changes
```bash
git add .
git commit -m "Add authentication system with email verification and multi-tenancy"
git push origin main
```

### 4.2 Verify Deployment
Vercel will automatically deploy. Wait 1-2 minutes, then test:

1. Visit `https://ndisapp.onmanylevels.com/`
2. Should redirect to `/login`
3. Try logging in with `aaozhogin@gmail.com` / `Miami2014`
4. Verify you can access calendar and all data

## Step 5: Test Authentication Features

### 5.1 Test Login
- Visit `/login`
- Enter email and password
- Should redirect to `/calendar` on success

### 5.2 Test Sign Up
- Visit `/signup`
- Create a new account with a different email
- Verify email confirmation email is received
- Click verification link
- Should be able to log in after verification

### 5.3 Test Password Recovery
- Visit `/forgot-password`
- Enter email address
- Check for password reset email
- Click reset link
- Set new password
- Verify can log in with new password

### 5.4 Test Data Isolation
- Log in as the new user from 5.2
- Verify they see NO shifts, carers, or clients (empty state)
- Create a test client/carer/shift
- Log out
- Log in as `aaozhogin@gmail.com`
- Verify you still see all your original data
- Verify you DON'T see the test user's data

## Step 6: Verify RLS Policies

### 6.1 Check Each Table
In Supabase SQL Editor, verify policies exist:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('shifts', 'carers', 'clients', 'line_items', 'invoices', 'saved_calendars')
ORDER BY tablename, policyname;
```

You should see 4 policies per table (SELECT, INSERT, UPDATE, DELETE), all filtering by `auth.uid() = user_id`.

### 6.2 Test Direct Database Access
Try querying as authenticated user:
```sql
-- This should only return your shifts
SELECT * FROM shifts;

-- This should only return your carers
SELECT * FROM carers;
```

## Troubleshooting

### Issue: "User not found" or "Invalid credentials"
- Verify the user account exists in Supabase Dashboard → Authentication → Users
- Check the password is correct
- Verify email is confirmed (if email confirmation is enabled)

### Issue: "No shifts/data visible after login"
- Check that `user_id` was properly set on existing data (run migration script again)
- Verify RLS policies are enabled and correct
- Check browser console for authentication errors

### Issue: "Email verification link doesn't work"
- Verify redirect URLs are configured correctly in Supabase
- Check that the email link matches your site URL
- Verify SMTP settings if using custom email provider

### Issue: Data from other users is visible
- RLS policies may not be correctly applied
- Re-run the `update_rls_policies_for_users.sql` script
- Verify `user_id` column exists on all tables
- Check that Supabase client is using authenticated session

## Email Templates (Optional Customization)

Go to: Supabase Dashboard → Authentication → Email Templates

Customize:
- Confirmation email
- Password reset email
- Email change confirmation

Include your brand name, logo, and styling.

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ user_id column exists on all tables
- ✅ RLS policies filter by auth.uid()
- ✅ Email confirmation enabled
- ✅ Password requirements enforced (min 6 chars by default)
- ✅ Secure password reset flow
- ✅ Protected routes redirect to login
- ✅ No hardcoded credentials in code
- ✅ Supabase keys properly set in Vercel environment variables

## Next Steps

1. Test thoroughly with multiple user accounts
2. Consider adding role-based access control (RBAC) if needed
3. Set up monitoring and error tracking
4. Configure custom email templates for better branding
5. Add user profile management page
6. Implement session timeout/refresh logic

## Support

If you encounter issues:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console for errors
3. Verify all environment variables are set correctly in Vercel
4. Review Supabase Auth documentation: https://supabase.com/docs/guides/auth
