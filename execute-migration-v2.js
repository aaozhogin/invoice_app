const postgres = require('postgres')
const fs = require('fs')
const path = require('path')
const { loadEnv } = require('./scripts/env')

// Try different connection formats
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: PASSWORD } = loadEnv()
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]

// Supabase direct connection (Transaction Mode)
const connectionString = `postgresql://postgres:${PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`

async function executeMigration() {
  let sql = null
  
  try {
    console.log('🔗 Connecting to database...')
    console.log(`   Using: db.${PROJECT_REF}.supabase.co\n`)
    
    // Connect using postgres package
    sql = postgres(connectionString, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10
    })
    
    // Test connection
    await sql`SELECT 1`
    console.log('✅ Connected!\n')
    
    console.log('📖 Reading migration file...\n')
    
    // Read the SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'SETUP_SQL_EDITOR.sql')
    const sqlContent = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('🚀 Executing migration...\n')
    
    // Split SQL into individual statements and execute one by one
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`Found ${statements.length} statements to execute\n`)
    
    let executed = 0
    for (const [index, statement] of statements.entries()) {
      try {
        // Skip comments and SELECT verification queries for now
        if (statement.includes('SELECT') && statement.includes('UNION ALL')) {
          console.log(`${index + 1}. Skipping verification query`)
          continue
        }
        
        if (statement.startsWith('--')) {
          continue
        }
        
        console.log(`${index + 1}. Executing...`)
        await sql.unsafe(statement)
        executed++
        console.log(`   ✓ Success`)
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`   ⚠️  Already exists (skipping)`)
        } else {
          console.log(`   ⚠️  ${err.message}`)
        }
      }
    }
    
    console.log(`\n✅ Executed ${executed} statements successfully!\n`)
    console.log('📋 Verifying setup...\n')
    
    // Verify tables were created
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'users', 'user_roles', 'permissions', 'role_permissions', 'audit_log')
      ORDER BY table_name
    `
    
    console.log('✅ Tables created:')
    tables.forEach(t => console.log(`   - ${t.table_name}`))
    
    // Check superadmin user
    console.log('\n👤 Checking superadmin user...')
    const users = await sql`
      SELECT id, email, first_name, last_name, is_active
      FROM public.users
      WHERE email = 'aaozhogin@gmail.com'
    `
    
    if (users.length > 0) {
      console.log('✅ Superadmin user created:')
      console.log(`   Email: ${users[0].email}`)
      console.log(`   Name: ${users[0].first_name} ${users[0].last_name}`)
      console.log(`   Active: ${users[0].is_active}`)
    } else {
      console.log('⚠️  Superadmin user not found (may need to be created separately)')
    }
    
    // Check counts
    console.log('\n📊 Record counts:')
    const orgCount = await sql`SELECT COUNT(*) as count FROM public.organizations`
    const roleCount = await sql`SELECT COUNT(*) as count FROM public.user_roles`
    const userCount = await sql`SELECT COUNT(*) as count FROM public.users`
    const permCount = await sql`SELECT COUNT(*) as count FROM public.permissions`
    
    console.log(`   Organizations: ${orgCount[0].count}`)
    console.log(`   Roles: ${roleCount[0].count}`)
    console.log(`   Users: ${userCount[0].count}`)
    console.log(`   Permissions: ${permCount[0].count}`)
    
    console.log('\n✅ Migration complete!\n')
    
  } catch (error) {
    console.error('❌ Error:')
    console.error(error.message)
    if (error.code) {
      console.error(`Code: ${error.code}`)
    }
    process.exit(1)
  } finally {
    if (sql) {
      await sql.end()
    }
  }
}

executeMigration()
