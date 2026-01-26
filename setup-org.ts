import { createClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } = loadEnv()

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function setup() {
  try {
    console.log('🔄 Setting up superadmin...\n')

    // 1. Create internal org
    console.log('1️⃣  Creating internal organization...')
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([{ name: 'Internal', slug: 'internal', is_active: true }])
      .select()
      .single()

    if (orgError) {
      console.log(`   Note: ${orgError.message} (may already exist)`)
    } else {
      console.log(`   ✓ Created: ${org.id}`)
    }

    // Get org ID
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'internal')
      .single()

    const orgId = orgs?.id
    console.log(`   Using org ID: ${orgId}\n`)

    // 2. Create superadmin role
    console.log('2️⃣  Creating superadmin role...')
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .insert([{ role_type: 'superadmin', description: 'Full system access' }])
      .select()
      .single()

    if (roleError) {
      console.log(`   Note: ${roleError.message}`)
    } else {
      console.log(`   ✓ Created: ${role.id}`)
    }

    // Get role ID
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_type', 'superadmin')
      .single()

    const roleId = roles?.id
    console.log(`   Using role ID: ${roleId}\n`)

    // 3. Link superadmin user
    console.log('3️⃣  Linking superadmin user...')
    const { error: userError } = await supabase
      .from('users')
      .insert([{
        id: '593c00f8-87f1-4123-aab8-d70fdfa80099',
        email: 'aaozhogin@gmail.com',
        first_name: 'Admin',
        last_name: 'Super',
        org_id: orgId,
        user_role_id: roleId,
        is_active: true
      }])

    if (userError) {
      console.log(`   ⚠️  ${userError.message}`)
      if (userError.message.includes('violates unique constraint')) {
        console.log('   Updating existing user instead...')
        const { error: updateError } = await supabase
          .from('users')
          .update({ org_id: orgId, user_role_id: roleId, is_active: true })
          .eq('id', '593c00f8-87f1-4123-aab8-d70fdfa80099')
        
        if (updateError) {
          throw updateError
        }
        console.log('   ✓ User updated')
      } else {
        throw userError
      }
    } else {
      console.log('   ✓ User created')
    }

    console.log('\n✅ Superadmin setup complete!')
    console.log('📧 Email: aaozhogin@gmail.com')
    console.log('🔐 You can now log in with your credentials')

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

setup()
