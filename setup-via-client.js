const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } = loadEnv()

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTablesSequentially() {
  try {
    console.log('🚀 Starting database setup...\n')
    
    // Step 1: Create organizations table using direct insert (table should exist already or create via client)
    console.log('1️⃣  Creating organizations table via INSERT...')
    try {
      const { data, error } = await supabase
        .from('organizations')
        .insert([{ 
          name: 'Internal', 
          slug: 'internal', 
          description: 'Internal organization',
          is_active: true 
        }])
        .select()
      
      if (error) {
        if (error.message.includes('Could not find the table')) {
          console.log('   ⚠️  Table does not exist. Need to create via SQL Editor.')
          console.log('   📋 Please go to: https://app.supabase.com/project/nnhlaceytkfyvqppzgle/sql/new')
          console.log('   📄 And paste the contents of: migrations/SETUP_SQL_EDITOR.sql')
          console.log('   ⏸️  Then run this script again.')
          process.exit(1)
        } else if (!error.message.includes('duplicate') && !error.message.includes('unique constraint')) {
          throw error
        } else {
          console.log('   ✓ Organization already exists')
        }
      } else {
        console.log('   ✓ Organization created')
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`)
    }
    
    // Get organization ID
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'internal')
      .single()
    
    if (!orgs) {
      throw new Error('Could not find internal organization')
    }
    
    console.log(`   Using org ID: ${orgs.id}\n`)
    
    // Step 2: Create superadmin role
    console.log('2️⃣  Creating superadmin role...')
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert([{ 
          role_type: 'superadmin',
          org_id: null,
          description: 'Full system access' 
        }])
      
      if (error && !error.message.includes('duplicate') && !error.message.includes('unique constraint')) {
        throw error
      } else {
        console.log('   ✓ Role created/exists')
      }
    } catch (err) {
      console.log(`   Error: ${err.message}`)
    }
    
    // Get role ID
    const { data: roles } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role_type', 'superadmin')
      .single()
    
    if (!roles) {
      throw new Error('Could not find superadmin role')
    }
    
    console.log(`   Using role ID: ${roles.id}\n`)
    
    // Step 3: Create/update superadmin user
    console.log('3️⃣  Creating superadmin user...')
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: '593c00f8-87f1-4123-aab8-d70fdfa80099',
        email: 'aaozhogin@gmail.com',
        first_name: 'Admin',
        last_name: 'Super',
        org_id: orgs.id,
        user_role_id: roles.id,
        is_active: true
      }, {
        onConflict: 'id'
      })
    
    if (userError) {
      throw userError
    }
    
    console.log('   ✓ User created/updated\n')
    
    // Verify
    console.log('📋 Verifying setup...\n')
    const { data: user } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, is_active')
      .eq('email', 'aaozhogin@gmail.com')
      .single()
    
    if (user) {
      console.log('✅ Superadmin user verified:')
      console.log(`   Email: ${user.email}`)
      console.log(`   Name: ${user.first_name} ${user.last_name}`)
      console.log(`   Active: ${user.is_active}`)
      console.log(`   ID: ${user.id}`)
    }
    
    console.log('\n✅ Setup complete! You can now log in.\n')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (error.details) {
      console.error('Details:', error.details)
    }
    if (error.hint) {
      console.error('Hint:', error.hint)
    }
    process.exit(1)
  }
}

createTablesSequentially()
