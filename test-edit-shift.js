// Test script to create a shift and verify edit functionality
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestShift() {
  try {
    // Create a test shift
    const { data: shift, error } = await supabase
      .from('shifts')
      .insert({
        shift_date: '2025-11-14',
        time_from: '09:00:00',
        time_to: '17:00:00',
        carer_id: 4, // Aleksandr Ozhogin
        client_id: 1, // John Smith
        line_item_code_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()

    if (error) {
      console.error('Error creating shift:', error)
      return
    }

    console.log('✅ Test shift created:', shift)
    console.log('📝 Now you can test clicking on the shift rectangle to edit it')
    console.log('   Expected behavior: All fields should be pre-populated with existing data')
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

createTestShift()