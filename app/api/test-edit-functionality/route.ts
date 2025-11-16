import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    
    console.log('🧪 Running comprehensive edit dialog test...')
    
    // Step 1: Test the current data structure
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select(`
        *, 
        carers(id, first_name, last_name, email), 
        line_items(id, code, category, description, billed_rate)
      `)
      .eq('shift_date', '2025-11-14')
      .order('time_from')
    
    if (shiftsError) {
      return NextResponse.json({ error: 'Failed to fetch shifts', details: shiftsError })
    }
    
    // Step 2: Get clients data
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
    
    if (clientsError) {
      return NextResponse.json({ error: 'Failed to fetch clients', details: clientsError })
    }
    
    // Step 3: Manually join data (simulating what the app does)
    const clientsMap = new Map((clients || []).map(client => [client.id, client]))
    const shiftsWithClients = (shifts || []).map(shift => ({
      ...shift,
      clients: shift.client_id ? clientsMap.get(shift.client_id) : null
    }))
    
    // Step 4: Test the edit dialog data extraction
    const testShift = shiftsWithClients[0]
    if (!testShift) {
      return NextResponse.json({ error: 'No shifts found for testing' })
    }
    
    // Simulate the handleEditShift function logic
    const fromTime = new Date(testShift.time_from)
    const toTime = new Date(testShift.time_to)
    
    const editDialogData = {
      shift_date: testShift.shift_date,
      start_time: `${fromTime.getHours().toString().padStart(2, '0')}:${fromTime.getMinutes().toString().padStart(2, '0')}`,
      end_time: `${toTime.getHours().toString().padStart(2, '0')}:${toTime.getMinutes().toString().padStart(2, '0')}`,
      carer_id: testShift.carer_id,
      client_id: testShift.client_id || null,
      category: testShift.line_items?.category || null,
      line_item_code_id: testShift.line_item_code_id?.toString() || null
    }
    
    return NextResponse.json({
      message: '✅ Edit dialog test completed successfully!',
      summary: {
        totalShifts: shiftsWithClients.length,
        totalClients: clients?.length || 0,
        hasClientRelationships: shiftsWithClients.some(s => s.clients),
        testShiftHasAllData: !!(
          testShift.carers &&
          testShift.line_items &&
          (testShift.client_id ? testShift.clients : true) // Allow null clients
        )
      },
      testShift,
      editDialogData,
      validation: {
        datePopulated: !!editDialogData.shift_date,
        timesPopulated: !!(editDialogData.start_time && editDialogData.end_time),
        carerPopulated: !!editDialogData.carer_id,
        clientCanBePopulated: editDialogData.client_id ? !!testShift.clients : true,
        categoryPopulated: !!editDialogData.category
      }
    })
    
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}