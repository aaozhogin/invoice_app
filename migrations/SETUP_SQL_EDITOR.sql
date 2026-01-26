-- ============================================================
-- USER MANAGEMENT SYSTEM - COMPLETE SETUP
-- ============================================================
-- Paste all of this into the Supabase SQL Editor and run it
-- https://app.supabase.com/project/nnhlaceytkfyvqppzgle/sql/new

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- 2. Create user_role_enum type
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'superadmin',
        'administrator',
        'service_provider',
        'carer',
        'customer',
        'support_coordinator'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_type user_role_enum NOT NULL,
    org_id UUID,
    description TEXT,
    UNIQUE(role_type, org_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_type ON public.user_roles(role_type);

-- 4. Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
    org_id UUID,
    user_role_id UUID NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON public.users(org_id);

-- 5. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    UNIQUE(resource, action),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);

-- 6. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Create internal organization
INSERT INTO public.organizations (name, slug, description, is_active)
VALUES ('Internal', 'internal', 'Internal organization for superadmin', true)
ON CONFLICT (slug) DO NOTHING;

-- Create superadmin role
INSERT INTO public.user_roles (role_type, org_id, description)
VALUES ('superadmin', NULL, 'Full access to entire system')
ON CONFLICT (role_type, org_id) DO NOTHING;

-- Insert sample permissions
INSERT INTO public.permissions (resource, action, description) VALUES
    ('users', 'create', 'Create new users'),
    ('users', 'read', 'View user details'),
    ('users', 'update', 'Update user information'),
    ('users', 'delete', 'Delete users'),
    ('users', 'manage_roles', 'Manage user roles'),
    ('shifts', 'create', 'Create shifts'),
    ('shifts', 'read', 'View shifts'),
    ('shifts', 'update', 'Update shifts'),
    ('shifts', 'delete', 'Delete shifts'),
    ('invoices', 'create', 'Create invoices'),
    ('invoices', 'read', 'View invoices'),
    ('invoices', 'update', 'Update invoices'),
    ('invoices', 'delete', 'Delete invoices'),
    ('reports', 'create', 'Create reports'),
    ('reports', 'read', 'View reports'),
    ('reports', 'export', 'Export reports')
ON CONFLICT (resource, action) DO NOTHING;

-- Link superadmin role to all permissions
INSERT INTO public.role_permissions (user_role_id, permission_id)
SELECT ur.id, p.id
FROM public.user_roles ur, public.permissions p
WHERE ur.role_type = 'superadmin'
ON CONFLICT DO NOTHING;

-- ============================================================
-- CREATE SUPERADMIN USER
-- ============================================================
-- The auth user 593c00f8-87f1-4123-aab8-d70fdfa80099 should already exist in auth.users
-- Get the org_id and user_role_id first, then run this:

INSERT INTO public.users (id, email, first_name, last_name, org_id, user_role_id, is_active)
SELECT
    '593c00f8-87f1-4123-aab8-d70fdfa80099'::UUID as id,
    'aaozhogin@gmail.com' as email,
    'Admin' as first_name,
    'Super' as last_name,
    o.id as org_id,
    ur.id as user_role_id,
    true as is_active
FROM public.organizations o
CROSS JOIN public.user_roles ur
WHERE o.slug = 'internal'
AND ur.role_type = 'superadmin'
ON CONFLICT (id) DO UPDATE SET
    user_role_id = EXCLUDED.user_role_id,
    org_id = EXCLUDED.org_id,
    is_active = EXCLUDED.is_active;

-- ============================================================
-- VERIFY SETUP
-- ============================================================

-- Verify all tables exist
SELECT 'organizations' as table_name, COUNT(*) as count FROM public.organizations
UNION ALL
SELECT 'user_roles', COUNT(*) FROM public.user_roles
UNION ALL
SELECT 'users', COUNT(*) FROM public.users
UNION ALL
SELECT 'permissions', COUNT(*) FROM public.permissions
UNION ALL
SELECT 'role_permissions', COUNT(*) FROM public.role_permissions
UNION ALL
SELECT 'audit_log', COUNT(*) FROM public.audit_log;

-- Verify superadmin was created
SELECT id, email, first_name, last_name, is_active FROM public.users WHERE email = 'aaozhogin@gmail.com';
