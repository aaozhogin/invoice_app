import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Checking all users in database...\n')

// Get all users from public.users table
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('id, email, first_name, last_name, user_role_id, is_active')
  .order('created_at', { ascending: false })

if (usersError) {
  console.log('❌ Error fetching users:', usersError.message)
  process.exit(1)
}

console.log(`📋 Total users in database: ${users?.length || 0}\n`)

if (users && users.length > 0) {
  users.forEach((u, i) => {
    console.log(`${i + 1}. ${u.first_name} ${u.last_name} (${u.email})`)
    console.log(`   ID: ${u.id}`)
    console.log(`   Role ID: ${u.user_role_id}`)
    console.log(`   Active: ${u.is_active}\n`)
  })
} else {
  console.log('No users found')
}

// Check auth.users to see if there are auth accounts
console.log('\n🔍 Checking auth.users...\n')
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

if (authError) {
  console.log('❌ Error fetching auth users:', authError.message)
} else {
  console.log(`📋 Total auth users: ${authUsers?.users?.length || 0}\n`)
  authUsers?.users?.forEach((u, i) => {
    console.log(`${i + 1}. ${u.email}`)
    console.log(`   ID: ${u.id}\n`)
  })
}
