const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } = loadEnv()

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function executeMigration() {
  try {
    console.log('🔄 Reading migration file...\n')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_user_management_system.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📝 Executing migration...\n')
    
    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', { sql })
    
    if (error) {
      // Try alternative method - split and execute statements
      console.log('⚠️  First method failed, trying direct execution...\n')
      
      // Split SQL by statements
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      console.log(`Found ${statements.length} statements\n`)
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';'
        console.log(`Executing statement ${i + 1}/${statements.length}...`)
        
        try {
          const { error: execError } = await supabase.rpc('exec_sql', { sql: stmt })
          if (execError) {
            console.log(`   ⚠️  ${execError.message}`)
          } else {
            console.log(`   ✓ Success`)
          }
        } catch (err) {
          console.log(`   Error: ${err.message}`)
        }
      }
    } else {
      console.log('✅ Migration executed successfully!')
    }
    
    // Verify tables were created
    console.log('\n📋 Verifying tables...\n')
    
    const tables = ['organizations', 'users', 'user_roles', 'permissions', 'role_permissions', 'audit_log']
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('COUNT(*)', { count: 'exact' })
        .limit(0)
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: EXISTS`)
      }
    }
    
    console.log('\n✅ Migration setup complete!')
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

executeMigration()
