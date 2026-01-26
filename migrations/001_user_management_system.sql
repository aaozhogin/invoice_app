-- ============================================================
-- USER MANAGEMENT SYSTEM MIGRATION
-- ============================================================
-- Creates the foundational user management system with:
-- - Organizations (multi-tenancy)
-- - User roles (superadmin, administrator, service_provider, carer, customer, support_coordinator)
-- - Permissions (for feature-level control)
-- - RLS policies for data isolation

-- ============================================================
-- 1. CREATE ORGANIZATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON public.organizations(is_active);

-- ============================================================
-- 2. CREATE USER_ROLES TABLE
-- ============================================================
CREATE TYPE user_role_enum AS ENUM (
    'superadmin',
    'administrator',
    'service_provider',
    'carer',
    'customer',
    'support_coordinator'
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_type user_role_enum NOT NULL,
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    description TEXT,
    -- Superadmin role has NULL org_id; all other roles must have org_id
    CHECK (role_type = 'superadmin' OR org_id IS NOT NULL),
    UNIQUE(role_type, org_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_org_id ON public.user_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_type ON public.user_roles(role_type);

-- ============================================================
-- 3. CREATE USERS TABLE (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    -- Superadmin has NULL org_id; others require org_id
    user_role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON public.users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_user_role_id ON public.users(user_role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);

-- ============================================================
-- 4. CREATE PERMISSIONS TABLE (for fine-grained control)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    UNIQUE(resource, action),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);

-- Insert base permissions
INSERT INTO public.permissions (resource, action, description) VALUES
    ('users', 'create', 'Create new users'),
    ('users', 'read', 'View user details'),
    ('users', 'update', 'Update user information'),
    ('users', 'delete', 'Delete users'),
    ('users', 'manage_roles', 'Manage user roles and permissions'),
    ('shifts', 'create', 'Create shifts'),
    ('shifts', 'read', 'View shifts'),
    ('shifts', 'update', 'Update shifts'),
    ('shifts', 'delete', 'Delete shifts'),
    ('shifts', 'bulk_assign', 'Assign shifts to carers'),
    ('invoices', 'create', 'Create invoices'),
    ('invoices', 'read', 'View invoices'),
    ('invoices', 'update', 'Update invoices'),
    ('invoices', 'delete', 'Delete invoices'),
    ('invoices', 'generate', 'Generate invoice reports'),
    ('reports', 'read', 'View reports'),
    ('reports', 'export', 'Export reports'),
    ('carers', 'create', 'Create carer profiles'),
    ('carers', 'read', 'View carer profiles'),
    ('carers', 'update', 'Update carer profiles'),
    ('carers', 'delete', 'Delete carer profiles'),
    ('clients', 'create', 'Create client profiles'),
    ('clients', 'read', 'View client profiles'),
    ('clients', 'update', 'Update client profiles'),
    ('clients', 'delete', 'Delete client profiles'),
    ('organizations', 'manage', 'Manage organization settings')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. CREATE ROLE_PERMISSIONS TABLE (junction table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(user_role_id, permission_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_user_role_id ON public.role_permissions(user_role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- ============================================================
-- 6. CREATE AUDIT_LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    changes JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type ON public.audit_log(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- ============================================================
-- 7. UPDATE TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ORGANIZATIONS RLS
-- ============================================================

-- Superadmins can see all organizations
CREATE POLICY "Superadmins can read all organizations"
    ON public.organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- Users can see their own organization
CREATE POLICY "Users can read their own organization"
    ON public.organizations FOR SELECT
    USING (
        id = (SELECT org_id FROM public.users WHERE id = auth.uid())
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- Only superadmins can create organizations
CREATE POLICY "Only superadmins can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- Only superadmins can update organizations
CREATE POLICY "Only superadmins can update organizations"
    ON public.organizations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- Only superadmins can delete organizations
CREATE POLICY "Only superadmins can delete organizations"
    ON public.organizations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- ============================================================
-- USER_ROLES RLS
-- ============================================================

-- Superadmins can see all roles
CREATE POLICY "Superadmins can read all roles"
    ON public.user_roles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- Administrators can see roles in their org
CREATE POLICY "Admins can read their org roles"
    ON public.user_roles FOR SELECT
    USING (
        org_id = (SELECT org_id FROM public.users WHERE id = auth.uid())
        AND
        (SELECT ur.role_type FROM public.user_roles ur
         JOIN public.users u ON u.user_role_id = ur.id
         WHERE u.id = auth.uid()) IN ('administrator', 'service_provider')
    );

-- Only superadmins can create roles
CREATE POLICY "Only superadmins can create roles"
    ON public.user_roles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- ============================================================
-- USERS RLS
-- ============================================================

-- Users can see themselves
CREATE POLICY "Users can read themselves"
    ON public.users FOR SELECT
    USING (id = auth.uid());

-- Users can see other users in their organization (if not carer/customer)
CREATE POLICY "Users can read their org users"
    ON public.users FOR SELECT
    USING (
        org_id = (SELECT org_id FROM public.users WHERE id = auth.uid())
        AND
        (SELECT ur.role_type FROM public.user_roles ur
         JOIN public.users u ON u.user_role_id = ur.id
         WHERE u.id = auth.uid()) NOT IN ('carer', 'customer')
    );

-- Superadmins can see all users
CREATE POLICY "Superadmins can read all users"
    ON public.users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- Users can update themselves
CREATE POLICY "Users can update themselves"
    ON public.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Administrators can update users in their org
CREATE POLICY "Admins can update their org users"
    ON public.users FOR UPDATE
    USING (
        org_id = (SELECT org_id FROM public.users WHERE id = auth.uid())
        AND
        (SELECT ur.role_type FROM public.user_roles ur
         JOIN public.users u ON u.user_role_id = ur.id
         WHERE u.id = auth.uid()) = 'administrator'
    )
    WITH CHECK (
        org_id = (SELECT org_id FROM public.users WHERE id = auth.uid())
    );

-- Service providers can update users in their org (except role changes)
CREATE POLICY "Service providers can update their org users"
    ON public.users FOR UPDATE
    USING (
        org_id = (SELECT org_id FROM public.users WHERE id = auth.uid())
        AND
        (SELECT ur.role_type FROM public.user_roles ur
         JOIN public.users u ON u.user_role_id = ur.id
         WHERE u.id = auth.uid()) = 'service_provider'
    )
    WITH CHECK (
        org_id = (SELECT org_id FROM public.users WHERE id = auth.uid())
        AND user_role_id = (SELECT user_role_id FROM public.users WHERE id = auth.uid() LIMIT 1)
    );

-- Only superadmins can create users
CREATE POLICY "Only superadmins can create users"
    ON public.users FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- Only superadmins can delete users
CREATE POLICY "Only superadmins can delete users"
    ON public.users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- ============================================================
-- PERMISSIONS RLS
-- ============================================================

-- All authenticated users can read permissions
CREATE POLICY "Authenticated users can read permissions"
    ON public.permissions FOR SELECT
    USING (auth.role() = 'authenticated');

-- ============================================================
-- ROLE_PERMISSIONS RLS
-- ============================================================

-- Superadmins can manage all role permissions
CREATE POLICY "Superadmins can manage role permissions"
    ON public.role_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- Administrators can manage role permissions in their org
CREATE POLICY "Admins can manage their org role permissions"
    ON public.role_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            JOIN public.user_roles ur2 ON ur2.id = role_permissions.user_role_id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'administrator'
            AND ur.org_id = ur2.org_id
        )
    );

-- ============================================================
-- AUDIT_LOG RLS
-- ============================================================

-- Users can read their own audit logs
CREATE POLICY "Users can read their own audit logs"
    ON public.audit_log FOR SELECT
    USING (user_id = auth.uid());

-- Superadmins can read all audit logs
CREATE POLICY "Superadmins can read all audit logs"
    ON public.audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'superadmin'
        )
    );

-- Administrators can read org audit logs
CREATE POLICY "Admins can read their org audit logs"
    ON public.audit_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.users u2 ON u2.org_id = u.org_id
            JOIN public.user_roles ur ON u.user_role_id = ur.id
            WHERE u.id = auth.uid()
            AND ur.role_type = 'administrator'
            AND u2.id = audit_log.user_id
        )
    );

-- Only the application can insert audit logs
CREATE POLICY "Application can insert audit logs"
    ON public.audit_log FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- 9. HELPER FUNCTIONS
-- ============================================================

-- Get the current user's role type
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role_enum AS $$
SELECT ur.role_type
FROM public.users u
JOIN public.user_roles ur ON u.user_role_id = ur.id
WHERE u.id = auth.uid()
LIMIT 1;
$$ LANGUAGE SQL;

-- Get the current user's organization
CREATE OR REPLACE FUNCTION get_current_user_org()
RETURNS UUID AS $$
SELECT org_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL;

-- Check if current user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
SELECT get_current_user_role() = 'superadmin';
$$ LANGUAGE SQL;

-- Check if current user is administrator
CREATE OR REPLACE FUNCTION is_administrator()
RETURNS BOOLEAN AS $$
SELECT get_current_user_role() = 'administrator';
$$ LANGUAGE SQL;

-- Check if current user has permission
CREATE OR REPLACE FUNCTION has_permission(p_resource TEXT, p_action TEXT)
RETURNS BOOLEAN AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    JOIN public.permissions p ON rp.permission_id = p.id
    JOIN public.users u ON u.user_role_id = rp.user_role_id
    WHERE u.id = auth.uid()
    AND p.resource = p_resource
    AND p.action = p_action
)
OR is_superadmin();
$$ LANGUAGE SQL;

-- ============================================================
-- 10. INITIALIZATION DATA
-- ============================================================

-- Create Internal organization for Superadmin
INSERT INTO public.organizations (name, slug, description)
VALUES ('Internal', 'internal', 'Internal organization for superadmin and system')
ON CONFLICT (slug) DO NOTHING;

-- Create Superadmin role
INSERT INTO public.user_roles (role_type, org_id, description)
VALUES ('superadmin', NULL, 'Full access to entire system')
ON CONFLICT (role_type, org_id) DO NOTHING;

-- Create organizational roles
INSERT INTO public.user_roles (role_type, org_id, description)
VALUES
    ('administrator', (SELECT id FROM public.organizations WHERE slug = 'internal'), 'Organization administrator'),
    ('service_provider', (SELECT id FROM public.organizations WHERE slug = 'internal'), 'Service provider/manager'),
    ('carer', (SELECT id FROM public.organizations WHERE slug = 'internal'), 'Carer'),
    ('customer', (SELECT id FROM public.organizations WHERE slug = 'internal'), 'Customer'),
    ('support_coordinator', (SELECT id FROM public.organizations WHERE slug = 'internal'), 'Support coordinator')
ON CONFLICT (role_type, org_id) DO NOTHING;

-- Grant all permissions to superadmin role
INSERT INTO public.role_permissions (user_role_id, permission_id)
SELECT ur.id, p.id
FROM public.user_roles ur
CROSS JOIN public.permissions p
WHERE ur.role_type = 'superadmin'
ON CONFLICT DO NOTHING;

-- Grant administrator permissions
INSERT INTO public.role_permissions (user_role_id, permission_id)
SELECT ur.id, p.id
FROM public.user_roles ur
CROSS JOIN public.permissions p
WHERE ur.role_type = 'administrator'
AND p.resource != 'organizations'
ON CONFLICT DO NOTHING;

-- Grant service_provider permissions
INSERT INTO public.role_permissions (user_role_id, permission_id)
SELECT ur.id, p.id
FROM public.user_roles ur
CROSS JOIN public.permissions p
WHERE ur.role_type = 'service_provider'
AND p.resource IN ('shifts', 'invoices', 'reports', 'carers', 'clients')
AND p.action != 'delete'
ON CONFLICT DO NOTHING;

-- Grant carer permissions
INSERT INTO public.role_permissions (user_role_id, permission_id)
SELECT ur.id, p.id
FROM public.user_roles ur
CROSS JOIN public.permissions p
WHERE ur.role_type = 'carer'
AND p.resource = 'shifts'
AND p.action IN ('read', 'update')
ON CONFLICT DO NOTHING;

-- Grant customer permissions
INSERT INTO public.role_permissions (user_role_id, permission_id)
SELECT ur.id, p.id
FROM public.user_roles ur
CROSS JOIN public.permissions p
WHERE ur.role_type = 'customer'
AND p.resource IN ('reports', 'clients')
AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- Grant support_coordinator permissions
INSERT INTO public.role_permissions (user_role_id, permission_id)
SELECT ur.id, p.id
FROM public.user_roles ur
CROSS JOIN public.permissions p
WHERE ur.role_type = 'support_coordinator'
AND p.resource = 'reports'
ON CONFLICT DO NOTHING;
