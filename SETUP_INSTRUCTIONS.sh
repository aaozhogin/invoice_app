#!/bin/bash

# This script creates the necessary tables for the user management system
# Run this SQL in the Supabase SQL Editor:
# https://app.supabase.com/project/nnhlaceytkfyvqppzgle/sql/new

cat << 'EOF'
-- ============================================================
-- USER MANAGEMENT SYSTEM - MINIMAL SETUP
-- ============================================================
-- Paste this entire SQL block into Supabase SQL Editor and run

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

-- 5. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    UNIQUE(resource, action),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Get role ID for superadmin (run this separately to get the ID)
SELECT id FROM public.user_roles WHERE role_type = 'superadmin' LIMIT 1;

-- Get org ID for internal (run this separately to get the ID)
SELECT id FROM public.organizations WHERE slug = 'internal' LIMIT 1;

-- Then create the superadmin user with the IDs you got from above:
-- INSERT INTO public.users (id, email, first_name, last_name, org_id, user_role_id, is_active)
-- VALUES (
--   '593c00f8-87f1-4123-aab8-d70fdfa80099',
--   'aaozhogin@gmail.com',
--   'Admin',
--   'Super',
--   '<org_id_from_above>',
--   '<role_id_from_above>',
--   true
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   user_role_id = EXCLUDED.user_role_id,
--   org_id = EXCLUDED.org_id,
--   is_active = EXCLUDED.is_active;

EOF

echo "
✅ Copy all the SQL above and paste it into:
   https://app.supabase.com/project/nnhlaceytkfyvqppzgle/sql/new

📋 Steps:
   1. Paste all CREATE TABLE statements
   2. Paste INSERT INTO for organizations and user_roles
   3. Run 'SELECT id FROM public.user_roles WHERE role_type = 'superadmin'' to get role_id
   4. Run 'SELECT id FROM public.organizations WHERE slug = 'internal'' to get org_id
   5. Paste the final INSERT for users with the IDs you got
   6. Run all queries

"
