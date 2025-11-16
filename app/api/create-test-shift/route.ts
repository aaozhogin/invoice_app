import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  try {
    // First check if we already have a shift today
    const today = new Date().toISOString().split('T')[0]
    
    const { data: existingShifts, error: checkError } = await supabase
      .from('shifts')
      .select('*')
      .eq('shift_date', today)

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existingShifts && existingShifts.length > 0) {
      return NextResponse.json({ 
        message: 'Test shift already exists for today',
        shift: existingShifts[0]
      })
    }

    // Create a test shift for today
    const { data: shift, error } = await supabase
      .from('shifts')
      .insert({
        shift_date: today,
        time_from: '09:00:00',
        time_to: '17:00:00',
        carer_id: 4, // Aleksandr Ozhogin
        client_id: 1, // John Smith - now explicitly setting this
        line_item_code_id: 1
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Test shift created successfully!',
      shift,
      instructions: 'Now navigate to /calendar and click on the shift rectangle to test edit functionality'
    })
  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 })
  }
}