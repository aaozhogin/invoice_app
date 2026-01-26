const { createClient } = require('@supabase/supabase-js')
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } = loadEnv()

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function checkSuperadmin() {
  console.log('🔍 Checking superadmin setup...\n')

  try {
    // Check if tables exist
    const { data: tables, error: tableError } = await supabase
      .from('users')
      .select('count')
      .limit(0)

    if (tableError) {
      console.log('❌ Tables not created yet')
      console.log('   Error:', tableError.message)
      console.log('\n📋 Please run the SQL in Supabase SQL Editor:')
      console.log('   1. Go to: https://app.supabase.com/project/nnhlaceytkfyvqppzgle/sql/new')
      console.log('   2. Paste: migrations/SETUP_SQL_EDITOR.sql')
      console.log('   3. Click Run\n')
      return
    }

    console.log('✅ Tables exist\n')

    // Check for superadmin user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        is_active,
        user_roles:user_role_id (
          role_type
        )
      `)
      .eq('email', 'aaozhogin@gmail.com')
      .single()

    if (userError || !user) {
      console.log('❌ Superadmin user not linked')
      console.log('\n📋 To fix:')
      console.log('   1. Make sure you ran the SQL migration')
      console.log('   2. Run: node setup-org.js')
      console.log('   3. Or manually link in Supabase SQL Editor\n')
      return
    }

    console.log('✅ Superadmin user found!\n')
    console.log('📧 Email:', user.email)
    console.log('👤 Name:', user.first_name, user.last_name)
    console.log('🎭 Role:', user.user_roles?.role_type)
    console.log('✓ Active:', user.is_active)
    console.log('🆔 ID:', user.id)

    if (user.user_roles?.role_type === 'superadmin') {
      console.log('\n🎉 Perfect! Your superadmin is fully configured!')
      console.log('\n📝 You can now:')
      console.log('   1. Log in at: http://localhost:3000/login')
      console.log('   2. See "Administration" menu in sidebar')
      console.log('   3. Access User Management')
      console.log('   4. See your role badge in the sidebar footer\n')
    } else {
      console.log('\n⚠️  User exists but role is not superadmin')
      console.log('   Please check the database setup\n')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkSuperadmin()
