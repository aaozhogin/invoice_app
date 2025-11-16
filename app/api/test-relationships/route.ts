import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    
    // First, let's check if shifts have proper client relationships
    console.log('🔍 Checking shifts table structure...')
    
    // Try to get shifts without any joins first
    const { data: basicShifts, error: basicError } = await supabase
      .from('shifts')
      .select('*')
      .limit(1)
    
    if (basicError) {
      console.error('Basic shifts query failed:', basicError)
      return NextResponse.json({ error: 'Basic shifts query failed', details: basicError })
    }
    
    console.log('✅ Basic shifts query works, sample shift:', basicShifts?.[0])
    
    // Now try with just carers join (which we know works)
    const { data: shiftsWithCarers, error: carersJoinError } = await supabase
      .from('shifts')
      .select('*, carers(id, first_name, last_name)')
      .limit(1)
    
    if (carersJoinError) {
      console.error('Carers join failed:', carersJoinError)
      return NextResponse.json({ error: 'Carers join failed', details: carersJoinError })
    }
    
    console.log('✅ Carers join works')
    
    // Now try with clients join (this is where the error likely occurs)
    const { data: shiftsWithClients, error: clientsJoinError } = await supabase
      .from('shifts')
      .select('*, clients(id, first_name, last_name)')
      .limit(1)
    
    if (clientsJoinError) {
      console.error('❌ Clients join failed:', clientsJoinError)
      
      // Let's try to fix the relationship by ensuring the foreign key exists
      console.log('🔧 Attempting to fix client relationship...')
      
      // Check if any shifts have client_id values
      const { data: shiftsWithClientIds, error: clientIdError } = await supabase
        .from('shifts')
        .select('id, client_id')
        .not('client_id', 'is', null)
        .limit(5)
      
      console.log('Shifts with client_ids:', shiftsWithClientIds)
      
      return NextResponse.json({ 
        error: 'Clients relationship broken', 
        details: clientsJoinError,
        shiftsWithClientIds,
        suggestion: 'Need to reconfigure foreign key relationship'
      })
    }
    
    console.log('✅ All joins work successfully!')
    
    return NextResponse.json({ 
      message: 'All relationships working correctly',
      basicShifts,
      shiftsWithCarers,
      shiftsWithClients
    })
    
  } catch (error) {
    console.error('Error in relationship test:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}