const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testShiftUpdate() {
  try {
    console.log('🧪 Testing shift update functionality...')
    
    // First, get an existing shift to update
    const { data: shifts, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .limit(1)
    
    if (fetchError) {
      console.error('❌ Error fetching shifts:', fetchError)
      return
    }
    
    if (!shifts || shifts.length === 0) {
      console.log('ℹ️ No shifts found to test update')
      return
    }
    
    const shiftToUpdate = shifts[0]
    console.log('📝 Found shift to update:', {
      id: shiftToUpdate.id,
      current_time_from: shiftToUpdate.time_from,
      current_time_to: shiftToUpdate.time_to
    })
    
    // Test updating the shift
    const { data: updateData, error: updateError } = await supabase
      .from('shifts')
      .update({
        time_from: shiftToUpdate.time_from,  // Keep same time to test update works
        time_to: shiftToUpdate.time_to,
        updated_at: new Date().toISOString()
      })
      .eq('id', shiftToUpdate.id)
      .select()
    
    if (updateError) {
      console.error('❌ Error updating shift:', updateError)
      console.error('Error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      return
    }
    
    console.log('✅ Shift updated successfully:', updateData)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testShiftUpdate()