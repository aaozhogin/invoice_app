const postgres = require('postgres')
const fs = require('fs')
const path = require('path')
const { loadEnv } = require('./scripts/env')

// Supabase connection string format:
// postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const { DATABASE_URL } = loadEnv()

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run execute-migration-direct.js')
}

const connectionString = DATABASE_URL

async function executeMigration() {
  let sql = null
  
  try {
    console.log('🔗 Connecting to database...\n')
    
    // Connect using postgres package
    sql = postgres(connectionString, {
      ssl: 'require',
      max: 1
    })
    
    console.log('✅ Connected!\n')
    console.log('📖 Reading migration file...\n')
    
    // Read the SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'SETUP_SQL_EDITOR.sql')
    const sqlContent = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('🚀 Executing migration...\n')
    
    // Execute the entire SQL file
    await sql.unsafe(sqlContent)
    
    console.log('✅ Migration executed successfully!\n')
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
      console.log('⚠️  Superadmin user not found')
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
    
    console.log('\n✅ Setup complete! You can now log in with aaozhogin@gmail.com\n')
    
  } catch (error) {
    console.error('❌ Error executing migration:')
    console.error(error.message)
    if (error.query) {
      console.error('\nFailed query:', error.query)
    }
    process.exit(1)
  } finally {
    if (sql) {
      await sql.end()
    }
  }
}

executeMigration()
