import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    
    // Get carers table structure
    const { data: carers, error: carersError } = await supabase
      .from('carers')
      .select('*')
      .limit(1)
    
    console.log('Carers query result:', { carers, carersError })
    
    // Get clients table structure
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(1)
    
    console.log('Clients query result:', { clients, clientsError })
    
    return NextResponse.json({ 
      carers: { data: carers, error: carersError },
      clients: { data: clients, error: clientsError }
    })
  } catch (error) {
    console.error('Error in debug-tables:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}