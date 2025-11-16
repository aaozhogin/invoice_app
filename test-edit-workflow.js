const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCompleteEditWorkflow() {
  try {
    console.log('🔄 Testing complete edit workflow...')
    
    // Step 1: Get existing data like the UI would
    const [shiftsRes, carersRes, clientsRes, lineItemsRes] = await Promise.all([
      supabase.from('shifts').select('*').limit(1),
      supabase.from('carers').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('line_items').select('*').limit(5)
    ])
    
    if (shiftsRes.error) {
      console.error('❌ Error fetching shifts:', shiftsRes.error)
      return
    }
    
    if (!shiftsRes.data || shiftsRes.data.length === 0) {
      console.log('ℹ️ No shifts found to test')
      return
    }
    
    const shift = shiftsRes.data[0]
    const carers = carersRes.data || []
    const clients = clientsRes.data || []
    const lineItems = lineItemsRes.data || []
    
    console.log('📊 Loaded data:', {
      shift: {
        id: shift.id,
        time_from: shift.time_from,
        time_to: shift.time_to,
        carer_id: shift.carer_id,
        client_id: shift.client_id,
        line_item_code_id: shift.line_item_code_id
      },
      carers_count: carers.length,
      clients_count: clients.length,
      line_items_count: lineItems.length
    })
    
    // Step 2: Simulate timezone conversion like the UI does
    const fromTime = new Date(shift.time_from)
    const toTime = new Date(shift.time_to)
    
    const fromTimeString = fromTime.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    })
    const toTimeString = toTime.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    })
    
    console.log('⏰ Time conversion:', {
      original_from: shift.time_from,
      original_to: shift.time_to,
      converted_from: fromTimeString,
      converted_to: toTimeString
    })
    
    // Step 3: Simulate the form data that would be submitted
    let selectedLineItemId = shift.line_item_code_id
    let selectedCategory = null
    
    if (shift.line_item_code_id) {
      const lineItem = lineItems.find(li => li.id === shift.line_item_code_id.toString())
      if (lineItem) {
        selectedLineItemId = lineItem.id
        selectedCategory = lineItem.category
      }
    }
    
    // If no valid line item, use default
    if (!selectedLineItemId && lineItems.length > 0) {
      const firstLineItem = lineItems[0]
      selectedLineItemId = firstLineItem.id
      selectedCategory = firstLineItem.category
    }
    
    // Handle client_id
    let clientId = shift.client_id || null
    if (!clientId && clients.length > 0) {
      clientId = clients[0].id
    }
    
    const shiftData = {
      shift_date: shift.shift_date,
      start_time: fromTimeString,
      end_time: toTimeString,
      carer_id: shift.carer_id,
      client_id: clientId,
      category: selectedCategory,
      line_item_code_id: Number(selectedLineItemId)
    }
    
    console.log('📝 Form data to submit:', shiftData)
    
    // Step 4: Convert times back to database format like handleSaveShift does
    const startDateTime = `${shiftData.shift_date}T${shiftData.start_time}:00`
    let endDateTime = `${shiftData.shift_date}T${shiftData.end_time}:00`
    
    // Handle overnight shifts
    const [startHour, startMin] = shiftData.start_time.split(':').map(Number)
    const [endHour, endMin] = shiftData.end_time.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    
    if (endMinutes <= startMinutes) {
      const nextDay = new Date(shiftData.shift_date)
      nextDay.setDate(nextDay.getDate() + 1)
      const nextDayStr = nextDay.toISOString().split('T')[0]
      endDateTime = `${nextDayStr}T${shiftData.end_time}:00`
    }
    
    const updateData = {
      shift_date: shiftData.shift_date,
      time_from: startDateTime,
      time_to: endDateTime,
      carer_id: shiftData.carer_id,
      // client_id: shiftData.client_id, // Temporarily removed - column doesn't exist in database
      line_item_code_id: Number(selectedLineItemId),
      cost: 100 // Simplified cost
    }
    
    console.log('🔄 Update data for database:', updateData)
    
    // Step 5: Attempt the update
    const { data: updateResult, error: updateError } = await supabase
      .from('shifts')
      .update(updateData)
      .eq('id', shift.id)
      .select()
    
    if (updateError) {
      console.error('❌ Update failed:', updateError)
      console.error('Error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      return
    }
    
    console.log('✅ Update successful:', updateResult[0])
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testCompleteEditWorkflow()