const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTableStructure() {
  try {
    console.log('🔍 Checking shifts table structure...')
    
    // Get table columns using Supabase introspection
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'shifts',
      schema_name: 'public'
    })
    
    if (error) {
      console.log('❌ RPC failed, trying direct table query:', error.message)
      
      // Alternative: Try to get one record and see what columns exist
      const { data: sampleData, error: sampleError } = await supabase
        .from('shifts')
        .select('*')
        .limit(1)
      
      if (sampleError) {
        console.error('❌ Error querying shifts table:', sampleError)
        return
      }
      
      if (sampleData && sampleData.length > 0) {
        console.log('📊 Shifts table columns (from sample data):', Object.keys(sampleData[0]))
        console.log('📊 Sample shift data:', sampleData[0])
      } else {
        console.log('ℹ️ No data in shifts table')
      }
    } else {
      console.log('📊 Table columns:', data)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkTableStructure()