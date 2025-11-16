const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testShiftsPageFunctionality() {
  try {
    console.log('🧪 Testing Shifts page functionality...')
    
    // Test 1: Verify we can load the data needed for the shifts page
    const [shiftsRes, carersRes, clientsRes, lineItemsRes] = await Promise.all([
      supabase.from('shifts').select(`
        *, 
        carers(id, first_name, last_name, email, color), 
        line_items(id, code, category, description, billed_rate)
      `).order('time_from', { ascending: false }).limit(3),
      supabase.from('carers').select('*').limit(3),
      supabase.from('clients').select('*').limit(3),
      supabase.from('line_items').select('*').limit(3)
    ])

    console.log('📊 Data loading results:')
    console.log('  Shifts:', shiftsRes.error ? `❌ ${shiftsRes.error.message}` : `✅ ${shiftsRes.data?.length || 0} shifts`)
    console.log('  Carers:', carersRes.error ? `❌ ${carersRes.error.message}` : `✅ ${carersRes.data?.length || 0} carers`)
    console.log('  Clients:', clientsRes.error ? `❌ ${clientsRes.error.message}` : `✅ ${clientsRes.data?.length || 0} clients`)
    console.log('  Line Items:', lineItemsRes.error ? `❌ ${lineItemsRes.error.message}` : `✅ ${lineItemsRes.data?.length || 0} line items`)

    // Test 2: Test creating a new shift (similar to what the form would do)
    if (!carersRes.error && carersRes.data && carersRes.data.length > 0 &&
        !lineItemsRes.error && lineItemsRes.data && lineItemsRes.data.length > 0) {
      
      const testCarer = carersRes.data[0]
      const testLineItem = lineItemsRes.data[0]
      
      console.log('\n🔬 Creating test shift...')
      console.log('  Using carer:', `${testCarer.first_name} ${testCarer.last_name}`)
      console.log('  Using line item:', `${testLineItem.category} - ${testLineItem.description}`)

      const testShiftData = {
        shift_date: '2025-11-16',
        time_from: '2025-11-16T09:00:00',
        time_to: '2025-11-16T17:00:00',
        carer_id: testCarer.id,
        line_item_code_id: testLineItem.id,
        cost: 560.00 // 8 hours * $70/hour (example)
      }

      const { data: newShift, error: createError } = await supabase
        .from('shifts')
        .insert(testShiftData)
        .select()

      if (createError) {
        console.log('❌ Shift creation failed:', createError.message)
      } else {
        console.log('✅ Test shift created successfully!')
        console.log('  Shift ID:', newShift[0].id)
        console.log('  Date:', newShift[0].shift_date)
        console.log('  Time:', `${newShift[0].time_from} to ${newShift[0].time_to}`)
        console.log('  Cost:', `$${newShift[0].cost}`)

        // Clean up - delete the test shift
        const { error: deleteError } = await supabase
          .from('shifts')
          .delete()
          .eq('id', newShift[0].id)
        
        if (deleteError) {
          console.log('⚠️ Could not clean up test shift:', deleteError.message)
        } else {
          console.log('🧹 Test shift cleaned up')
        }
      }
    }

    // Test 3: Verify cost calculation logic components
    console.log('\n📈 Testing cost calculation components...')
    if (!lineItemsRes.error && lineItemsRes.data) {
      const categories = [...new Set(lineItemsRes.data.map(item => item.category).filter(Boolean))]
      console.log('  Available categories:', categories)
      
      const coreItems = lineItemsRes.data.filter(item => item.category === 'CORE')
      console.log('  CORE line items:', coreItems.length)
      
      if (coreItems.length > 0) {
        const sampleItem = coreItems[0]
        console.log('  Sample line item:')
        console.log('    Description:', sampleItem.description)
        console.log('    Rate:', `$${sampleItem.billed_rate}/hr`)
        console.log('    Time range:', `${sampleItem.time_from} - ${sampleItem.time_to}`)
        console.log('    Days:', {
          weekday: sampleItem.weekday,
          saturday: sampleItem.saturday,
          sunday: sampleItem.sunday,
          sleepover: sampleItem.sleepover
        })
      }
    }

    console.log('\n🎉 Shifts page functionality test completed!')
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testShiftsPageFunctionality()