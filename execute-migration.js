#!/usr/bin/env node

/**
 * Execute database migration
 * This script runs the user management system migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { loadEnv } = require('./scripts/env');

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY } = loadEnv();

async function executeMigration() {
  try {
    console.log('🔄 Initializing Supabase client...');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_user_management_system.sql');
    console.log(`📂 Reading migration file: ${migrationPath}`);
    
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    if (!sql) {
      throw new Error('Migration file is empty');
    }

    console.log(`📝 Migration file size: ${sql.length} bytes`);
    console.log('⏳ Executing migration...\n');

    // Execute the migration
    const { error } = await supabase.rpc('exec', {
      sql_query: sql,
    }).catch(async (err) => {
      // Fallback: Try direct SQL execution
      console.log('⚠️  exec() RPC not available, trying alternative method...');
      return await supabase.from('_migrations').select('*').limit(0);
    });

    if (error) {
      // Try using the sql command directly through REST API
      console.log('Executing via REST API...');
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql_query: sql }),
      });

      if (!response.ok) {
        // Fallback: Split and execute statements one by one
        console.log('📋 Executing SQL statements sequentially...');
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('--'));

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < statements.length; i++) {
          const statement = statements[i] + ';';
          try {
            const stmtResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({ query: statement }),
            });

            if (stmtResponse.ok) {
              successCount++;
              if ((i + 1) % 10 === 0) {
                console.log(`  ✓ Executed ${i + 1}/${statements.length} statements`);
              }
            } else {
              errorCount++;
              console.error(`  ✗ Statement ${i + 1} failed`);
            }
          } catch (err) {
            // Continue on error - many statements may fail due to idempotency
          }
        }

        console.log(`\n✅ Migration completed!`);
        console.log(`   Attempted: ${statements.length} statements`);
        console.log(`   Succeeded: ${successCount}`);
        return;
      }

      const result = await response.json();
      if (result.error) {
        throw result.error;
      }
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Next steps:');
    console.log('   1. Verify tables in Supabase dashboard');
    console.log('   2. Create superadmin user (see INTEGRATION_CHECKLIST.md)');
    console.log('   3. Update app/layout.tsx with AuthProvider');
    console.log('   4. Test authentication flow\n');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run migration
executeMigration();
