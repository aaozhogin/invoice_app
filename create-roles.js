import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('📋 Creating missing roles...\n')

const roles = [
  { role_type: 'administrator', description: 'Administrator with elevated permissions' },
  { role_type: 'service_provider', description: 'Service provider access' },
  { role_type: 'carer', description: 'Carer access' },
  { role_type: 'customer', description: 'Customer access' },
  { role_type: 'support_coordinator', description: 'Support coordinator access' }
]

for (const roleData of roles) {
  const { error } = await supabase
    .from('user_roles')
    .insert({
      role_type: roleData.role_type,
      org_id: null,
      description: roleData.description
    })

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('Conflict')) {
      console.log(`✅ Role '${roleData.role_type}' already exists`)
    } else {
      console.log(`❌ Error creating role '${roleData.role_type}':`, error.message)
    }
  } else {
    console.log(`✅ Created role '${roleData.role_type}'`)
  }
}

console.log('\n✨ Done!')
