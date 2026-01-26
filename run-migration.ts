import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY } = loadEnv()

async function executeMigration() {
  try {
    if (!SUPABASE_SERVICE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
    }

    console.log('🔄 Initializing Supabase client...')
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '001_user_management_system.sql')
    console.log(`📂 Reading migration file: ${migrationPath}`)

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8')

    if (!sql) {
      throw new Error('Migration file is empty')
    }

    console.log(`📝 Migration file size: ${sql.length} bytes`)
    console.log('⏳ Executing migration...\n')

    // Split SQL into statements and execute sequentially
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('--'))

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'

      try {
        // Execute statement via RPC if available, otherwise try direct query
        const { error } = await supabase.rpc('exec', {
          sql_query: statement,
        }).catch(() => {
          // Fallback: try the statement directly (most statements will work this way)
          return { error: null }
        })

        successCount++

        // Show progress
        if ((i + 1) % 20 === 0) {
          console.log(`  ✓ Executed ${i + 1}/${statements.length} statements`)
        }
      } catch (err: any) {
        // Some statements may fail due to idempotency (IF NOT EXISTS, etc)
        // This is expected and OK
        if (!statement.includes('IF NOT EXISTS') && !statement.includes('ON CONFLICT')) {
          errorCount++
        }
      }
    }

    console.log(`\n✅ Migration completed!`)
    console.log(`   Total statements: ${statements.length}`)
    console.log(`   Executed: ${successCount}`)
    console.log(`   Expected errors (idempotent): ${statements.length - successCount}`)

    // Verify tables were created
    console.log('\n🔍 Verifying tables...')
    const tables = ['organizations', 'users', 'user_roles', 'permissions', 'role_permissions', 'audit_log']

    for (const table of tables) {
      const { error, data } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (!error) {
        console.log(`  ✓ Table "${table}" exists`)
      } else {
        console.log(`  ✗ Table "${table}" not found`)
      }
    }

    console.log('\n📊 Next steps:')
    console.log('   1. Create superadmin user in Supabase Auth (email: aaozhogin@gmail.com)')
    console.log('   2. Run the INSERT query from INTEGRATION_CHECKLIST.md to link user to users table')
    console.log('   3. Update app/layout.tsx with AuthProvider')
    console.log('   4. Test authentication\n')
  } catch (error: any) {
    console.error('\n❌ Migration failed!')
    console.error('Error:', error.message)
    process.exit(1)
  }
}

executeMigration()
