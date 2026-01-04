const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkShifts() {
  try {
    const { data: shifts } = await supabase.from('shifts').select('*').limit(3)
    
    if (shifts && shifts.length > 0) {
      console.log('📊 Sample shifts:')
      shifts.forEach(shift => {
        console.log(JSON.stringify(shift, null, 2))
        console.log('---')
      })
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

checkShifts()
