import { getSupabaseClient } from '@/app/lib/supabaseClient'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient()

    // Find Alexis Lysenko's client ID
    const { data: alexisClients, error: findError } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('first_name', 'Alexis')
      .eq('last_name', 'Lysenko')
      .limit(1)

    if (findError) throw findError
    if (!alexisClients || alexisClients.length === 0) {
      return NextResponse.json(
        { error: 'Alexis Lysenko not found in clients table' },
        { status: 404 }
      )
    }

    const alexisId = alexisClients[0].id
    console.log(`Found Alexis Lysenko with ID: ${alexisId}`)

    // Find shifts with NULL client_id
    const { data: nullClientShifts, error: findShiftsError } = await supabase
      .from('shifts')
      .select('id, shift_date, time_from, time_to, carer_id, client_id')
      .is('client_id', null)

    if (findShiftsError) throw findShiftsError

    if (!nullClientShifts || nullClientShifts.length === 0) {
      return NextResponse.json(
        { message: 'No shifts with NULL client_id found', updated: 0 },
        { status: 200 }
      )
    }

    console.log(`Found ${nullClientShifts.length} shifts with NULL client_id`)

    // Update all shifts with NULL client_id to Alexis Lysenko
    const { error: updateError } = await supabase
      .from('shifts')
      .update({ client_id: alexisId })
      .is('client_id', null)

    if (updateError) throw updateError

    console.log(`✅ Successfully updated ${nullClientShifts.length} shifts to client_id: ${alexisId}`)

    return NextResponse.json(
      {
        message: `Successfully updated ${nullClientShifts.length} shifts to Alexis Lysenko`,
        updated: nullClientShifts.length,
        alexisId
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
