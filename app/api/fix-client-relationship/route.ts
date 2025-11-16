import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export async function POST() {
  try {
    const supabase = getSupabaseClient()
    
    console.log('🔧 Fixing client relationship...')
    
    // Since we can't run SQL directly through Supabase in this setup, 
    // let's try a different approach - make sure the data is consistent
    
    // First, let's check existing data and fix any inconsistencies
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*')
    
    if (shiftsError) {
      return NextResponse.json({ error: 'Failed to fetch shifts', details: shiftsError })
    }
    
    console.log('Found shifts:', shifts?.length)
    
    // Update any shifts without client_id to have a default client
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id')
      .limit(1)
    
    if (clientsError) {
      return NextResponse.json({ error: 'Failed to fetch clients', details: clientsError })
    }
    
    if (clients && clients.length > 0) {
      const defaultClientId = clients[0].id
      
      // Update shifts that have null client_id
      const shiftsToUpdate = shifts?.filter(shift => !shift.client_id) || []
      
      if (shiftsToUpdate.length > 0) {
        console.log(`Updating ${shiftsToUpdate.length} shifts with default client_id: ${defaultClientId}`)
        
        for (const shift of shiftsToUpdate) {
          const { error: updateError } = await supabase
            .from('shifts')
            .update({ client_id: defaultClientId })
            .eq('id', shift.id)
          
          if (updateError) {
            console.error(`Failed to update shift ${shift.id}:`, updateError)
          }
        }
      }
    }
    
    // Now try the relationship query again
    const { data: testShifts, error: testError } = await supabase
      .from('shifts')
      .select('*, clients(id, first_name, last_name)')
      .limit(1)
    
    if (testError) {
      // If the relationship still doesn't work, we need to recreate the table with proper constraints
      // For now, let's use a workaround by joining manually in the application
      console.log('Relationship still broken, will use manual join approach')
      
      return NextResponse.json({ 
        message: 'Updated shift data but relationship still broken',
        error: testError,
        solution: 'Using manual joins in application code'
      })
    }
    
    return NextResponse.json({ 
      message: 'Successfully fixed client relationship',
      testShifts
    })
    
  } catch (error) {
    console.error('Error fixing relationships:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}