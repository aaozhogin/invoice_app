const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testShiftUpdateFixed() {
  try {
    console.log('🔧 Testing fixed shift update functionality...')
    
    // Get existing shift
    const { data: shifts, error: fetchError } = await supabase
      .from('shifts')
      .select('*')
      .limit(1)
    
    if (fetchError) {
      console.error('❌ Error fetching shifts:', fetchError)
      return
    }
    
    if (!shifts || shifts.length === 0) {
      console.log('ℹ️ No shifts found')
      return
    }
    
    const shift = shifts[0]
    console.log('📊 Testing update of shift:', {
      id: shift.id,
      current_times: `${shift.time_from} to ${shift.time_to}`,
      carer_id: shift.carer_id,
      line_item_code_id: shift.line_item_code_id
    })
    
    // Get line items for testing
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('line_items')
      .select('*')
      .limit(3)
    
    if (lineItemsError) {
      console.error('❌ Error fetching line items:', lineItemsError)
      return
    }
    
    const testLineItem = lineItems && lineItems.length > 0 ? lineItems[0] : null
    
    // Test update with the fixed structure (no client_id)
    const updateData = {
      time_from: '2025-11-14T10:00:00+00:00', // Test new time
      time_to: '2025-11-14T16:00:00+00:00',   // Test new time
      carer_id: shift.carer_id,
      line_item_code_id: testLineItem ? testLineItem.id : shift.line_item_code_id,
      cost: 150.00
    }
    
    console.log('🔄 Attempting update with fixed data:', updateData)
    
    const { data: result, error: updateError } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', shift.id)
      .select()
    
    if (updateError) {
      console.error('❌ Update still failed:', updateError)
      return
    }
    
    console.log('✅ Shift update successful!', result[0])
    console.log('🎉 Time changed from', `${shift.time_from} to`, result[0].time_from)
    console.log('🎉 End time changed from', `${shift.time_to} to`, result[0].time_to)
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testShiftUpdateFixed()