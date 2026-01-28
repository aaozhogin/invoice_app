import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nnhlaceytkfyvqppzgle.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function linkSuperadminUser() {
  try {
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
    }

    console.log('🔄 Linking superadmin user...')
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Get auth user ID
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      throw new Error(`Failed to list users: ${authError.message}`)
    }

    const superadminUser = authUsers.users.find((u) => u.email === 'aaozhogin@gmail.com')
    
    if (!superadminUser) {
      throw new Error('Superadmin user not found in auth.users')
    }

    console.log(`✓ Found superadmin user: ${superadminUser.id}`)

    // Get internal org ID
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'internal')
      .single()

    if (orgError || !org) {
      throw new Error('Internal organization not found')
    }

    console.log(`✓ Found internal organization: ${org.id}`)

    // Get superadmin role ID
    const { data: role, error: roleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_type', 'superadmin')
      .is('org_id', null)
      .single()

    if (roleError || !role) {
      throw new Error('Superadmin role not found')
    }

    console.log(`✓ Found superadmin role: ${role.id}`)

    // Insert into public.users
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

    console.log(`\n✅ Superadmin user linked successfully!`)
    console.log(`   User ID: ${newUser.id}`)
    console.log(`   Email: ${newUser.email}`)
    console.log(`   Role: superadmin`)
    console.log(`\n📝 You can now log in with:`)
    console.log(`   Email: aaozhogin@gmail.com`)
    console.log(`   Password: (the password you set)\n`)
  } catch (error: any) {
    console.error('\n❌ Failed to link superadmin user!')
    console.error('Error:', error.message)
    process.exit(1)
  }
}

linkSuperadminUser()
