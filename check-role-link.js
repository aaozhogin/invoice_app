import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Checking role link...\n')

// Query user with direct field selection (no JOIN)
const { data: user, error: userError } = await supabase
  .from('users')
  .select('id, email, first_name, last_name, user_role_id, is_active')
  .eq('email', 'aaozhogin@gmail.com')
  .single()

if (userError) {
  console.log('❌ User query error:', userError.message)
  process.exit(1)
}

console.log('✅ User found:')
console.log('   ID:', user.id)
console.log('   Email:', user.email)
console.log('   Name:', user.first_name, user.last_name)
console.log('   Role ID:', user.user_role_id)
console.log('   Active:', user.is_active)
console.log()

// Now fetch the role separately
if (user.user_role_id) {
  const { data: role, error: roleError } = await supabase
    .from('user_roles')
    .select('id, role_type')
    .eq('id', user.user_role_id)
    .single()

  if (roleError) {
    console.log('❌ Role query error:', roleError.message)
  } else {
    console.log('✅ Role found:')
    console.log('   Role ID:', role.id)
    console.log('   Role Type:', role.role_type)
    console.log()
    
    if (role.role_type === 'superadmin') {
      console.log('🎉 SUCCESS! Superadmin is properly configured!')
      console.log('📋 You can now:')
      console.log('   1. Log in at http://localhost:3000/login')
      console.log('   2. You should see "Administration" menu in sidebar')
      console.log('   3. Click "User Management" to manage users')
    }
  }
} else {
  console.log('❌ user_role_id is NULL - needs to be set')
  console.log('📋 The superadmin role ID is: d3b29709-d00f-4c88-8811-f3c4aad0b429')
}
