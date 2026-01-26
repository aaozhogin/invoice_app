import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔄 Creating user profiles for auth users...\n')

// Get all auth users
const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
if (authError) {
  console.log('❌ Error fetching auth users:', authError.message)
  process.exit(1)
}

const authUsers = authData?.users || []
console.log(`Found ${authUsers.length} auth users\n`)

// Get existing users in public.users
const { data: existingUsers } = await supabase
  .from('users')
  .select('id')

const existingIds = new Set((existingUsers || []).map((u) => u.id))

// Get organization and administrator role
const { data: org } = await supabase
  .from('organizations')
  .select('id')
  .eq('slug', 'internal')
  .single()

const { data: adminRole } = await supabase
  .from('user_roles')
  .select('id')
  .eq('role_type', 'administrator')
  .single()

if (!org) {
  console.log('❌ Internal organization not found')
  process.exit(1)
}

if (!adminRole) {
  console.log('❌ Administrator role not found')
  process.exit(1)
}

console.log(`✅ Found organization: ${org.id}`)
console.log(`✅ Found administrator role: ${adminRole.id}\n`)

// Create profiles for missing users
const toCreate = authUsers.filter((u) => !existingIds.has(u.id))

if (toCreate.length === 0) {
  console.log('✅ All auth users already have profiles')
  process.exit(0)
}

console.log(`Creating profiles for ${toCreate.length} user(s)...\n`)

for (const authUser of toCreate) {
  const nameParts = (authUser.user_metadata?.full_name || authUser.email).split(' ')
  const firstName = nameParts[0] || 'User'
  const lastName = nameParts.slice(1).join(' ') || ''

  const { error } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email,
      first_name: firstName,
      last_name: lastName,
      org_id: org.id,
      user_role_id: adminRole.id,
      is_active: true
    })

  if (error) {
    console.log(`❌ Error creating profile for ${authUser.email}:`, error.message)
  } else {
    console.log(`✅ Created Administrator profile for ${authUser.email}`)
  }
}

console.log('\n✨ Done!')
