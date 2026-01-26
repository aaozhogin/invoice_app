# User Management System - Integration Checklist

## Files Created

### Database Migration
- [x] `migrations/001_user_management_system.sql` - Complete schema with RLS policies

### Authentication Layer
- [x] `lib/auth-context.tsx` - Auth context provider with role/permission checks
- [x] `lib/permissions.ts` - Permission definitions and utility functions
- [x] `lib/server-auth.ts` - Server-side authorization utilities

### API Routes
- [x] `app/api/users/route.ts` - GET (list), POST (create) users
- [x] `app/api/users/[id]/route.ts` - GET, PUT, DELETE individual users

### UI Components & Pages
- [x] `components/ProtectedRoute.tsx` - Access control wrapper
- [x] `app/admin/users/page.tsx` - User management interface

### Documentation
- [x] `USER_MANAGEMENT_GUIDE.md` - Complete setup and usage guide

## Integration Steps

### Step 1: Database Setup (CRITICAL)
- [ ] Open Supabase SQL Editor
- [ ] Copy contents of `migrations/001_user_management_system.sql`
- [ ] Execute the entire script
- [ ] Verify all tables created: organizations, users, user_roles, permissions, role_permissions, audit_log
- [ ] Verify RLS is enabled on all tables
- [ ] Check that seed data was inserted (superadmin role, internal org, permissions)

### Step 2: Update App Layout
- [ ] Open `app/layout.tsx` (or your root layout)
- [ ] Import AuthProvider:
  ```typescript
  import { AuthProvider } from '@/lib/auth-context'
  ```
- [ ] Wrap children with AuthProvider:
  ```typescript
  <AuthProvider>{children}</AuthProvider>
  ```

### Step 3: Create Superadmin User
- [ ] In Supabase → Authentication → Users, create auth user with:
  - Email: `aaozhogin@gmail.com`
  - Password: (set strong password)
- [ ] Go to SQL Editor and run:
  ```sql
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    org_id,
    user_role_id,
    is_active
  ) VALUES (
    (SELECT id FROM auth.users WHERE email = 'aaozhogin@gmail.com'),
    'aaozhogin@gmail.com',
    'Admin',
    'User',
    (SELECT id FROM public.organizations WHERE slug = 'internal'),
    (SELECT id FROM public.user_roles WHERE role_type = 'superadmin'),
    true
  );
  ```
- [ ] Test login with superadmin account

### Step 4: Test Authentication
- [ ] Create a simple page to test `useAuth()` hook
- [ ] Verify user is loaded after login
- [ ] Check that role is correctly displayed
- [ ] Test permission checks

### Step 5: Protect Existing Routes
For each sensitive route, wrap with ProtectedRoute:
- [ ] Wrap `/admin` routes with `<ProtectedRoute requiredRoles={['superadmin', 'administrator']}>`
- [ ] Wrap shift management with `<ProtectedRoute requiredRoles={['service_provider', 'administrator']}>`
- [ ] Wrap invoice generation with `<ProtectedRoute requiredPermission={{ resource: 'invoices', action: 'generate' }}>`

### Step 6: Update API Routes
For each API route that handles sensitive data:
- [ ] Import authorization functions from `lib/server-auth.ts`
- [ ] Add `authorizeRequest()` or `authorizeWithRole()` check
- [ ] Return 401/403 if unauthorized
- [ ] Log action in audit_log

Example:
```typescript
export async function POST(request: NextRequest) {
  const { authorized, user, response } = await authorizeWithRole(
    request,
    ['administrator']
  )
  if (!authorized) return response
  // Protected logic...
}
```

### Step 7: Test User Management Interface
- [ ] Navigate to `/admin/users` as superadmin
- [ ] Verify user list loads
- [ ] Create a new user
- [ ] Edit user (if UI updated)
- [ ] Test search functionality
- [ ] Verify role badge displays

### Step 8: Test Role-Based Access
Create test users with each role and verify:
- [ ] Superadmin can see all data
- [ ] Administrator can see org data
- [ ] Service Provider has limited create
- [ ] Carer can only see own shifts
- [ ] Customer has read-only access
- [ ] Support Coordinator sees reports only

### Step 9: Test RLS Policies
- [ ] Open Supabase → SQL Editor
- [ ] Try direct queries with different user roles
- [ ] Verify RLS blocks unauthorized access
- [ ] Check that `SELECT` respects org_id filtering

### Step 10: Integrate with Existing Tables
For carers, shifts, clients, invoices tables:
- [ ] Add `org_id` column (FK to organizations)
- [ ] Add RLS policies to filter by org_id
- [ ] Update API routes to enforce org_id checks

Example RLS policy for shifts:
```sql
CREATE POLICY "Users can see shifts in their org or assigned to them"
ON shifts FOR SELECT
USING (
  org_id = (SELECT org_id FROM users WHERE id = auth.uid())
  OR
  assigned_carer_id = auth.uid()
  OR
  EXISTS (SELECT 1 FROM users u 
          JOIN user_roles ur ON u.user_role_id = ur.id
          WHERE u.id = auth.uid() 
          AND ur.role_type IN ('superadmin', 'administrator'))
);
```

## Verification Checklist

### Database Level
- [ ] organizations table has data
- [ ] users table has at least superadmin
- [ ] user_roles table has all 6 roles
- [ ] permissions table populated
- [ ] role_permissions linked correctly
- [ ] RLS enabled on all tables

### Application Level
- [ ] AuthProvider wraps app
- [ ] useAuth() hook works
- [ ] isSuperadmin() returns true for superadmin
- [ ] hasPermission() checks work
- [ ] Protected components don't render for unauthorized users

### API Level
- [ ] /api/users requires auth
- [ ] GET /api/users returns org-filtered list
- [ ] POST /api/users requires admin role
- [ ] 403 returned for forbidden requests
- [ ] 401 returned for unauthenticated

### Security Level
- [ ] Users can't bypass RLS with direct queries
- [ ] org_id can't be spoofed from client
- [ ] Service role key not exposed in frontend
- [ ] Audit log records user actions

## Common Issues & Solutions

### Issue: "User profile not found"
**Solution:** 
1. Check auth user exists in Supabase
2. Run INSERT query to create public.users record
3. Match auth.users.id with users.id

### Issue: RLS policy blocking legitimate queries
**Solution:**
1. Check user's org_id matches resource org_id
2. Verify role is in the policy condition
3. Check policy uses `auth.uid()` correctly
4. Test policy in SQL Editor with specific user

### Issue: Permission denied on API
**Solution:**
1. Check Authorization header is set
2. Verify JWT token is valid
3. Check user's role has required permission
4. Check user's org matches resource org

### Issue: useAuth hook not working
**Solution:**
1. Check AuthProvider wraps entire app
2. Ensure hook called in client component ('use client')
3. Check browser console for errors
4. Verify session is loaded (check loading state)

## Next: Integrate with Existing Features

Once core user management is working:

1. **Carers Table Integration** - Add org_id, update RLS
2. **Shifts Table Integration** - Add org_id, org-based filtering
3. **Clients Table Integration** - Add org_id, org-based access
4. **Invoices Table Integration** - Add org_id, role-based visibility
5. **Reports** - Implement org-specific and role-based report access

See `USER_MANAGEMENT_GUIDE.md` for detailed instructions.
