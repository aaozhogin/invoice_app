#!/usr/bin/env node

/**
 * Direct SQL execution via Supabase REST API
 * This bypasses the schema cache issues
 */

import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { loadEnv } = require('./scripts/env.js')
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  SUPABASE_ANON_KEY: ANON_KEY,
} = loadEnv()

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SQL Error: ${error}`)
  }

  return response
}

async function setup() {
  try {
    console.log('🔄 Setting up user management...\n')

    // 1. Create organizations table
    console.log('📝 Creating organizations table...')
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✓ Organizations table created\n')

    // 2. Create user_role_enum type
    console.log('📝 Creating user_role_enum type...')
    await executeSQL(`
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
    `)
    console.log('✓ User role enum created\n')

    // 3. Create user_roles table
    console.log('📝 Creating user_roles table...')
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_type user_role_enum NOT NULL,
        org_id UUID,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✓ User roles table created\n')

    // 4. Create users table
    console.log('📝 Creating users table...')
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.users (
        id UUID PRIMARY KEY,
        email TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        org_id UUID,
        user_role_id UUID,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✓ Users table created\n')

    // 5. Create permissions table
    console.log('📝 Creating permissions table...')
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✓ Permissions table created\n')

    // 6. Create role_permissions table
    console.log('📝 Creating role_permissions table...')
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_role_id UUID NOT NULL,
        permission_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✓ Role permissions table created\n')

    // 7. Create audit_log table
    console.log('📝 Creating audit_log table...')
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS public.audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        changes JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✓ Audit log table created\n')

    // 8. Insert default organization
    console.log('📝 Creating internal organization...')
    await executeSQL(`
      INSERT INTO public.organizations (name, slug, description) 
      VALUES ('Internal', 'internal', 'Internal organization for superadmin')
      ON CONFLICT (slug) DO NOTHING;
    `)
    console.log('✓ Internal organization created\n')

    // 9. Insert superadmin role
    console.log('📝 Creating superadmin role...')
    await executeSQL(`
      INSERT INTO public.user_roles (role_type, org_id, description) 
      VALUES ('superadmin', NULL, 'Full access to entire system')
      ON CONFLICT DO NOTHING;
    `)
    console.log('✓ Superadmin role created\n')

    // 10. Insert other roles (optional, for internal org)
    console.log('📝 Creating other roles...')
    const orgId = await getOrgId()
    if (orgId) {
      await Promise.all([
        executeSQL(`INSERT INTO public.user_roles (role_type, org_id, description) 
                   VALUES ('administrator', '${orgId}', 'Organization admin')
                   ON CONFLICT DO NOTHING;`),
        executeSQL(`INSERT INTO public.user_roles (role_type, org_id, description) 
                   VALUES ('service_provider', '${orgId}', 'Service provider')
                   ON CONFLICT DO NOTHING;`),
        executeSQL(`INSERT INTO public.user_roles (role_type, org_id, description) 
                   VALUES ('carer', '${orgId}', 'Carer')
                   ON CONFLICT DO NOTHING;`),
        executeSQL(`INSERT INTO public.user_roles (role_type, org_id, description) 
                   VALUES ('customer', '${orgId}', 'Customer')
                   ON CONFLICT DO NOTHING;`),
        executeSQL(`INSERT INTO public.user_roles (role_type, org_id, description) 
                   VALUES ('support_coordinator', '${orgId}', 'Support coordinator')
                   ON CONFLICT DO NOTHING;`),
      ])
    }
    console.log('✓ Other roles created\n')

    console.log('✅ Database setup complete!\n')
    console.log('📝 Next: Create superadmin user in Supabase Auth\n')

  } catch (error) {
    console.error('❌ Setup failed!')
    console.error(error.message)
    process.exit(1)
  }
}

async function getOrgId() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/organizations?slug=eq.internal&select=id`, {
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      },
    })
    const data = await response.json()
    return data[0]?.id
  } catch (err) {
    return null
  }
}

setup()
