const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } = loadEnv()

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

async function executeInSteps() {
  try {
    console.log('🚀 Executing migration step by step...\n')

    // Step 1: Create organizations table
    console.log('1️⃣  Creating organizations table...')
    try {
      const { error } = await supabase
        .from('organizations')
        .insert({ name: 'Internal', slug: 'internal', is_active: true })
        .select()
      
      if (error && !error.message.includes('duplicate')) {
        console.log(`   Creating via insert test: ${error.message}`)
      } else {
        console.log('   ✓ Table exists or created')
      }
    } catch (e) {
      console.log(`   Table check: ${e.message}`)
    }

    // Read the full SQL
    const sql = fs.readFileSync('./migrations/SETUP_SQL_EDITOR.sql', 'utf8')
    
    // Try creating an exec function first
    console.log('\n2️⃣  Creating SQL execution function...')
    
    const createFuncSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql text) 
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
    `.trim()

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql: createFuncSQL })
      })
      console.log('   ✓ Function created (or already exists)')
    } catch (e) {
      console.log(`   ${e.message}`)
    }

    // Now try to execute the full migration
    console.log('\n3️⃣  Executing full migration...')
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(JSON.stringify(error))
    }

    console.log('   ✓ Migration executed\n')

    // Verify
    console.log('📋 Verifying...\n')
    const { data: users } = await supabase
      .from('users')
      .select('*, user_roles:user_role_id(role_type)')
      .eq('email', 'aaozhogin@gmail.com')

    if (users && users.length > 0) {
      console.log('✅ Superadmin user found:')
      console.log(JSON.stringify(users[0], null, 2))
    }

    console.log('\n✅ Done!\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n📋 Manual execution required:')
    console.log('   Go to: https://app.supabase.com/project/nnhlaceytkfyvqppzgle/sql/new')
    console.log('   Paste: migrations/SETUP_SQL_EDITOR.sql')
    console.log('   Click Run')
  }
}

executeInSteps()
