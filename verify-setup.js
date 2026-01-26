const { createClient } = require('@supabase/supabase-js')
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } = loadEnv()

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function verify() {
  console.log('🔍 Detailed verification...\n')

  // Check user with join
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      id,
      email,
      first_name,
      last_name,
      is_active,
      user_role_id,
      user_roles!inner (
        id,
        role_type
      )
    `)
    .eq('email', 'aaozhogin@gmail.com')
    .single()

  if (error) {
    console.log('❌ Error:', error.message)
  } else {
    console.log('✅ User found:')
    console.log(JSON.stringify(user, null, 2))
  }

  // Check all users
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
  
  console.log('\n📋 Total users in database:', allUsers?.length || 0)
  
  // Check roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('*')
  
  console.log('📋 Total roles:', roles?.length || 0)
  if (roles) {
    roles.forEach(r => console.log(`   - ${r.role_type} (${r.id})`))
  }
}

verify()
