const { Client } = require('pg')
const fs = require('fs')
const path = require('path')
const { loadEnv } = require('./scripts/env')

// Supabase connection details
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = loadEnv()
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]

const connectionConfig = {
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: `postgres.${PROJECT_REF}`,
  password: SUPABASE_SERVICE_ROLE_KEY,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000
}

async function executeMigration() {
  const client = new Client(connectionConfig)
  
  try {
    console.log('🔗 Connecting to Supabase database...\n')
    await client.connect()
    console.log('✅ Connected!\n')

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'SETUP_SQL_EDITOR.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('🚀 Executing migration SQL...\n')
    
    // Execute the entire SQL file
    await client.query(sql)
    
    console.log('✅ Migration executed successfully!\n')

    // Verify tables
    console.log('📋 Verifying tables...\n')
    
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('organizations', 'users', 'user_roles', 'permissions', 'role_permissions', 'audit_log')
      ORDER BY table_name
    `)
    
    console.log('✅ Tables created:')
    tables.rows.forEach(t => console.log(`   - ${t.table_name}`))
    
    // Check superadmin
    console.log('\n👤 Checking superadmin user...')
    const userCheck = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, ur.role_type
      FROM public.users u
      LEFT JOIN public.user_roles ur ON u.user_role_id = ur.id
      WHERE u.email = 'aaozhogin@gmail.com'
    `)
    
    if (userCheck.rows.length > 0) {
      const user = userCheck.rows[0]
      console.log('✅ Superadmin user found:')
      console.log(`   Email: ${user.email}`)
      console.log(`   Name: ${user.first_name} ${user.last_name}`)
      console.log(`   Role: ${user.role_type}`)
      console.log(`   Active: ${user.is_active}`)
      console.log(`   ID: ${user.id}`)
    } else {
      console.log('⚠️  Superadmin user not found')
    }
    
    // Get counts
    console.log('\n📊 Record counts:')
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM public.organizations) as orgs,
        (SELECT COUNT(*) FROM public.user_roles) as roles,
        (SELECT COUNT(*) FROM public.users) as users,
        (SELECT COUNT(*) FROM public.permissions) as perms
    `)
    const { orgs, roles, users, perms } = counts.rows[0]
    console.log(`   Organizations: ${orgs}`)
    console.log(`   Roles: ${roles}`)
    console.log(`   Users: ${users}`)
    console.log(`   Permissions: ${perms}`)
    
    console.log('\n🎉 Setup complete! You can now log in at http://localhost:3000/login\n')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.detail) console.error('Detail:', error.detail)
    if (error.hint) console.error('Hint:', error.hint)
    process.exit(1)
  } finally {
    await client.end()
  }
}

executeMigration()
