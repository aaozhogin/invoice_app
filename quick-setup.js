const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } = loadEnv()

async function runSQL(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { error }
    }
    return { success: true }
  } catch (err) {
    return { error: err.message }
  }
}

async function quickSetup() {
  try {
    console.log('🔄 Quick setup: Creating user management tables...\n')

    // Step 1: Create organizations table
    console.log('1️⃣  Creating organizations table...')
    let result = await runSQL(`
      CREATE TABLE IF NOT EXISTS public.organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log(result.error ? `   Error: ${JSON.stringify(result.error)}` : '   ✓ Created')

    // Step 2: Create user_role_enum type  
    console.log('2️⃣  Creating user_role_enum type...')
    result = await runSQL(`
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
    console.log(result.error ? `   Error: ${JSON.stringify(result.error)}` : '   ✓ Created')

    // Step 3: Create user_roles table
    console.log('3️⃣  Creating user_roles table...')
    result = await runSQL(`
      CREATE TABLE IF NOT EXISTS public.user_roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role_type user_role_enum NOT NULL,
        org_id UUID,
        description TEXT,
        UNIQUE(role_type, org_id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log(result.error ? `   Error: ${JSON.stringify(result.error)}` : '   ✓ Created')

    // Step 4: Create users table
    console.log('4️⃣  Creating users table...')
    result = await runSQL(`
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
    `)
    console.log(result.error ? `   Error: ${JSON.stringify(result.error)}` : '   ✓ Created')

    // Step 5: Create permissions table
    console.log('5️⃣  Creating permissions table...')
    result = await runSQL(`
      CREATE TABLE IF NOT EXISTS public.permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        UNIQUE(resource, action),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log(result.error ? `   Error: ${JSON.stringify(result.error)}` : '   ✓ Created')

    // Step 6: Create role_permissions table
    console.log('6️⃣  Creating role_permissions table...')
    result = await runSQL(`
      CREATE TABLE IF NOT EXISTS public.role_permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_role_id UUID NOT NULL,
        permission_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log(result.error ? `   Error: ${JSON.stringify(result.error)}` : '   ✓ Created')

    // Step 7: Create audit_log table
    console.log('7️⃣  Creating audit_log table...')
    result = await runSQL(`
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
    console.log(result.error ? `   Error: ${JSON.stringify(result.error)}` : '   ✓ Created')

    console.log('\n✅ Tables created! Now run setup-org.js to link the superadmin user.')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

quickSetup()
