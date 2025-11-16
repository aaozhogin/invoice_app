const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function addClientIdColumn() {
  try {
    console.log('🔧 Adding client_id column to shifts table...')
    
    // First, let's check if the column already exists
    const { data: existingShift, error: checkError } = await supabase
      .from('shifts')
      .select('*')
      .limit(1)
    
    if (checkError) {
      console.error('❌ Error checking existing table:', checkError)
      return
    }
    
    if (existingShift && existingShift.length > 0) {
      const columns = Object.keys(existingShift[0])
      console.log('📊 Current columns:', columns)
      
      if (columns.includes('client_id')) {
        console.log('✅ client_id column already exists!')
        return
      }
    }
    
    console.log('➕ Adding client_id column...')
    
    // Since we can't run DDL with the anon key, let's try using an API route instead
    const response = await fetch('/api/setup-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.text()
    console.log('✅ Migration result:', result)
    
  } catch (error) {
    console.error('❌ Error adding client_id column:', error)
    
    // Alternative: Try to trigger the setup through the existing API
    console.log('🔄 Trying alternative approach...')
    try {
      const altResponse = await fetch('http://localhost:3000/api/setup-db', {
        method: 'GET'
      })
      
      if (altResponse.ok) {
        const altResult = await altResponse.text()
        console.log('✅ Alternative approach result:', altResult)
      } else {
        console.error('❌ Alternative approach failed')
      }
    } catch (altError) {
      console.error('❌ Alternative approach error:', altError)
    }
  }
}

addClientIdColumn()