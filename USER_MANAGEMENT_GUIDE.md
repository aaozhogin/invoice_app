# User Management System Implementation Guide

This document outlines the complete user management system that has been implemented with 6 roles, multi-tenancy, and row-level security.

## Architecture Overview

### Role Hierarchy

1. **Superadmin** (`aaozhogin@gmail.com` only)
   - Full access to entire system
   - Can manage all organizations and users
   - Can view all data across organizations
   - Belongs to "Internal" organization

2. **Administrator** (Organization-specific)
   - Organization administrator
   - Full control within their organization
   - Can create and manage all roles under their org
   - Can access all features (users, shifts, invoices, reports, carers, clients)

3. **Service Provider** (Organization-specific)
   - Manager of the organization
   - Create/edit shifts, assign shifts to carers
   - Generate invoices and reports
   - Manage carers, customers, line item codes
   - Cannot delete resources

4. **Carer** (Organization-specific)
   - View their own shifts in detail
   - See other carers' shifts in grey (time reserved indicator)
   - Can update their own shift status
   - Access to iOS/Android app features
   - Limited report access

5. **Customer** (Organization-specific)
   - Access to customer-specific reports
   - View approved carers roster within organization
   - Read-only access to reports and clients

6. **Support Coordinator** (Organization-specific)
   - Access to reports and analytics
   - Export reports
   - Read-only access to reporting data

## Database Schema

### Core Tables

#### `organizations`
- Multi-tenancy support
- Stores organization metadata
- Superadmin can create/manage organizations
- Internal org reserved for system use

#### `users`
- Extends Supabase `auth.users`
- Links to organizations and user_roles
- org_id is NULL for superadmin only
- is_active flag for soft-deactivation

#### `user_roles`
- Defines available roles per organization
- Superadmin role has NULL org_id
- All org-specific roles must reference an organization

#### `permissions`
- Fine-grained permission definitions
- Resource + action pairs (e.g., "shifts:create")
- Pre-populated with standard permissions

#### `role_permissions`
- Junction table linking roles to permissions
- Enables flexible permission management
- All permissions granted to superadmin

#### `audit_log`
- Tracks all user actions
- Stores changes and timestamps
- Superadmin and org admins can view

## Security Implementation

### Row-Level Security (RLS) Policies

All tables have RLS enabled with the following policies:

#### Organizations
- Superadmins: can see and modify all
- Users: can see only their own organization
- Creation/deletion: superadmin only

#### Users
- Users can view themselves
- Admin/Service Provider: can view users in their org
- Superadmin: can view all users
- Update: users can update themselves (limited fields)
- Admin: can update org users
- Create/Delete: superadmin only

#### User Roles
- Superadmin: full access
- Admin: can see roles in their org
- Creation: superadmin only

#### Permissions & Role Permissions
- All authenticated users can read permissions
- Superadmin: can manage all role permissions
- Admin: can manage role permissions in their org

#### Audit Log
- Users can see their own audit logs
- Superadmin: can see all audit logs
- Admins: can see org audit logs

## Implementation Files

### Database
- **File:** `migrations/001_user_management_system.sql`
- **Contains:** Full schema, RLS policies, seed data, helper functions
- **Run in:** Supabase SQL Editor

### Authentication Layer

#### Auth Context (`lib/auth-context.tsx`)
- Manages current user state
- Provides role and permission check functions
- Syncs with Supabase auth state
- Client-side only (not secure for sensitive operations)

**Available hooks:**
```typescript
const { 
  user,           // Current authenticated user
  loading,        // Loading state
  isSuperadmin(), // Check if superadmin
  hasPermission(resource, action), // Check permission
  hasAnyRole([roles]), // Check if user has any role
  canManageUsers(), // Convenience function
  canCreateInvoices(), // Convenience function
} = useAuth()
```

#### Permission Utilities (`lib/permissions.ts`)
- Permission definitions per role
- Helper functions for permission checks
- Role display formatting
- Color schemes for UI

#### Server Auth (`lib/server-auth.ts`)
- Server-side authorization for API routes
- Functions to get authenticated user from request
- Enforce permissions on the server
- Audit logging helpers

### API Routes

#### GET `/api/users`
- List users in organization
- Requires: authentication, admin/service provider role
- Returns: paginated user list

#### POST `/api/users`
- Create new user
- Requires: authentication, admin/superadmin role
- Body: email, password, first_name, last_name, role_type
- Returns: created user object

#### GET `/api/users/[id]`
- Get specific user
- Requires: authentication, self or admin
- Returns: user details

#### PUT `/api/users/[id]`
- Update user
- Requires: authentication, self (limited) or admin/superadmin
- Returns: updated user object

#### DELETE `/api/users/[id]`
- Delete user
- Requires: authentication, superadmin role only
- Returns: success response

### UI Components

#### `components/ProtectedRoute.tsx`
- Wrapper component for role-based access
- Shows loading/unauthorized states
- Usage:
```typescript
<ProtectedRoute requiredRoles={['superadmin', 'administrator']}>
  <Dashboard />
</ProtectedRoute>
```

#### `app/admin/users/page.tsx`
- User management page
- Accessible by admin/superadmin
- Features:
  - User list with search
  - Create new user form
  - User status indicators
  - Role display
  - Edit/delete actions

## Setup Instructions

### 1. Run Database Migration

1. Go to Supabase dashboard → SQL Editor
2. Create new query
3. Copy entire contents of `migrations/001_user_management_system.sql`
4. Execute the migration
5. Verify tables created in Table Editor

### 2. Update App Layout

Update your app layout to include AuthProvider:

```typescript
// app/layout.tsx
import { AuthProvider } from '@/lib/auth-context'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### 3. Create Initial Superadmin User

First, manually create a Supabase auth user with email `aaozhogin@gmail.com`, then run:

```sql
-- In Supabase SQL Editor
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

### 4. Create Organization (Optional)

```sql
INSERT INTO public.organizations (name, slug, description)
VALUES ('My Organization', 'my-organization', 'First organization');

-- Create roles for the organization
INSERT INTO public.user_roles (role_type, org_id, description)
VALUES
  ('administrator', (SELECT id FROM public.organizations WHERE slug = 'my-organization'), 'Admin'),
  ('service_provider', (SELECT id FROM public.organizations WHERE slug = 'my-organization'), 'Service Provider'),
  ('carer', (SELECT id FROM public.organizations WHERE slug = 'my-organization'), 'Carer'),
  ('customer', (SELECT id FROM public.organizations WHERE slug = 'my-organization'), 'Customer'),
  ('support_coordinator', (SELECT id FROM public.organizations WHERE slug = 'my-organization'), 'Support Coordinator');
```

## Usage Examples

### Check User Role in Component
```typescript
'use client'
import { useAuth } from '@/lib/auth-context'

export function MyComponent() {
  const { isSuperadmin, isServiceProvider, hasPermission } = useAuth()

  return (
    <div>
      {isSuperadmin() && <AdminPanel />}
      {isServiceProvider() && <ShiftManager />}
      {hasPermission('invoices', 'generate') && <GenerateInvoices />}
    </div>
  )
}
```

### Create Protected API Route
```typescript
// app/api/my-route/route.ts
import { authorizeWithRole } from '@/lib/server-auth'

export async function GET(request: NextRequest) {
  const { authorized, user, response } = await authorizeWithRole(
    request,
    ['superadmin', 'administrator']
  )

  if (!authorized) return response

  // Your protected logic here
  return NextResponse.json({ data: 'success' })
}
```

### Conditionally Show UI
```typescript
'use client'
import { ConditionalRender } from '@/components/ProtectedRoute'

export function MyUI() {
  return (
    <>
      <ConditionalRender requiredRoles={['administrator']}>
        <AdminButton />
      </ConditionalRender>

      <ConditionalRender requiredPermission={{ resource: 'invoices', action: 'create' }}>
        <CreateInvoiceButton />
      </ConditionalRender>
    </>
  )
}
```

## Important Security Considerations

✅ **DO:**
- Always verify permissions on the server for sensitive operations
- Use RLS policies as the source of truth
- Validate org_id matches user's organization (server-side)
- Log all admin actions in audit_log
- Test that users cannot bypass RLS with direct queries
- Keep service role key secret (use only on server)

❌ **DON'T:**
- Rely only on client-side role checks
- Pass user role from client without verification
- Allow org_id to be user input (fetch from auth context)
- Store sensitive data without RLS policies
- Expose service role key in frontend code

## Testing

### Test Superadmin Access
1. Sign in as aaozhogin@gmail.com
2. Access `/admin/users`
3. Should see all users across all organizations

### Test Organization Admin Access
1. Create organization and user with admin role
2. Sign in as that user
3. Should only see users in their org
4. Cannot create users outside org

### Test Carer Access
1. Create user with carer role
2. Sign in as carer
3. Should not see `/admin/users`
4. Should see shift info but cannot create

### Test RLS Policies
1. Open Supabase SQL Editor
2. Use different service role tokens
3. Verify RLS blocks unauthorized queries

## Next Steps

1. **Customize permissions** - Adjust role_permissions based on your needs
2. **Add org creation UI** - Allow superadmin to create organizations
3. **Implement org switching** - Let users switch between orgs they belong to
4. **Add audit dashboard** - Show audit logs to admins
5. **Integrate with existing tables** - Add org_id and RLS to carers, shifts, etc.
6. **Email notifications** - Send user creation/password reset emails
7. **Two-factor authentication** - Add 2FA for sensitive roles

## Troubleshooting

### Users Can't Login
- Check if user.is_active = true
- Verify user record exists in public.users table
- Check auth.users table for the user

### RLS Policy Errors
- Ensure RLS is enabled on all tables
- Check policy conditions match your data
- Use Supabase SQL Editor to test policies

### Permission Denied on API
- Verify Authorization header has valid JWT
- Check user has required role
- Check user belongs to correct organization

## Support

For issues or questions:
1. Check RLS policies in Supabase
2. Verify user_roles and permissions are correctly linked
3. Check audit_log for failed operations
4. Review server logs for API errors
