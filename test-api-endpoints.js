const fs = require('fs')
const path = require('path')
const { loadEnv } = require('./scripts/env')

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY } = loadEnv()
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split('.')[0]

async function executeSQL(sql) {
  // Try multiple API endpoints
  const endpoints = [
    // Management API
    {
      url: `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    },
    // Database Query endpoint
    {
      url: `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/query`,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    },
    // PostgREST query endpoint
    {
      url: `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec`,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    }
  ]
  
  for (const [index, endpoint] of endpoints.entries()) {
    try {
      console.log(`Trying endpoint ${index + 1}...`)
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: endpoint.headers,
        body: endpoint.body
      })
      
      const data = await response.json()
      
      if (response.ok) {
        console.log(`✅ Success with endpoint ${index + 1}`)
        return { success: true, data }
      } else {
        console.log(`❌ Endpoint ${index + 1} failed: ${JSON.stringify(data)}`)
      }
    } catch (err) {
      console.log(`❌ Endpoint ${index + 1} error: ${err.message}`)
    }
  }
  
  return { success: false }
}

async function main() {
  console.log('🚀 Attempting to execute SQL via various Supabase APIs...\n')
  
  const sql = `
    CREATE TABLE IF NOT EXISTS public.organizations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  
  const result = await executeSQL(sql)
  
  if (!result.success) {
    console.log('\n❌ None of the API endpoints worked.')
    console.log('\n📋 Manual setup required:')
    console.log('   1. Open: https://app.supabase.com/project/nnhlaceytkfyvqppzgle/sql/new')
    console.log('   2. Paste contents of: migrations/SETUP_SQL_EDITOR.sql')
    console.log('   3. Click "Run" to execute')
    console.log('\n   Then run: node setup-via-client.js')
    process.exit(1)
  }
}

main()
