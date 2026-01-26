import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = loadEnv()

async function setupSuperadmin() {
  try {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    console.log('🔄 Setting up superadmin...\n')

    // Check if internal org exists
    let { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'internal')
      .single()

    if (orgError || !org) {
      console.log('📝 Creating internal organization...')
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name: 'Internal',
          slug: 'internal',
          description: 'Internal organization for superadmin and system',
          is_active: true,
        })
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create org: ${createError.message}`)
      }

      if (!newOrg) {
        throw new Error('Failed to create organization')
      }

      org = newOrg
      console.log(`✓ Created internal organization: ${newOrg.id}\n`)
    } else {
      console.log(`✓ Internal organization exists: ${org.id}\n`)
    }

    // Get auth user
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const superadminUser = authUsers?.users.find((u) => u.email === 'aaozhogin@gmail.com')

    if (!superadminUser) {
      throw new Error('Superadmin user not found in auth.users. Create it in Supabase first.')
    }

    console.log(`✓ Found superadmin user: ${superadminUser.id}`)

    // Get superadmin role
    let { data: role } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_type', 'superadmin')
      .is('org_id', null)
      .single()

    if (!role) {
      console.log('📝 Creating superadmin role...')
      const { data: newRole, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          role_type: 'superadmin',
          org_id: null,
          description: 'Full access to entire system',
        })
        .select()
        .single()

      if (roleError) {
        throw new Error(`Failed to create role: ${roleError.message}`)
      }

      if (!newRole) {
        throw new Error('Failed to create role')
      }

      role = newRole
      console.log(`✓ Created superadmin role: ${newRole.id}\n`)
    } else {
      console.log(`✓ Superadmin role exists: ${role.id}\n`)
    }

    if (!org || !role) {
      throw new Error('Organization or role not properly initialized')
    }

    // Link user to users table
    console.log('📝 Linking user to users table...')
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', superadminUser.id)
      .single()

    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: superadminUser.id,
          email: superadminUser.email,
          first_name: 'Admin',
          last_name: 'User',
          org_id: org.id,
          user_role_id: role.id,
          is_active: true,
        })
        .select()
        .single()

      if (insertError) {
        throw new Error(`Failed to insert user: ${insertError.message}`)
      }

      console.log(`✓ User linked successfully\n`)
    } else {
      console.log(`✓ User already exists in users table\n`)
    }

    console.log('✅ Superadmin setup complete!')
    console.log(`\n📝 You can now log in with:`)
    console.log(`   Email: aaozhogin@gmail.com`)
    console.log(`   Password: (the password you set)\n`)
  } catch (error: any) {
    console.error('\n❌ Setup failed!')
    console.error('Error:', error.message)
    process.exit(1)
  }
}

setupSuperadmin()
