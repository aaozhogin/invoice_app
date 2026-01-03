import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find Alexis Lysenko client
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('first_name', 'Alexis')
      .eq('last_name', 'Lysenko')

    if (clientsError) {
      throw clientsError
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json(
        { 
          error: 'Alexis Lysenko client not found',
          message: 'Please create the client first'
        },
        { status: 404 }
      )
    }

    const clientId = clients[0].id

    // Update all shifts to have this client_id
    const { data, error } = await supabase
      .from('shifts')
      .update({ client_id: clientId })
      .is('client_id', null)
      .select('id, client_id')

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${data?.length || 0} shifts to client: Alexis Lysenko (ID: ${clientId})`,
      updatedCount: data?.length || 0,
      clientId
    })
  } catch (error) {
    console.error('Error updating shifts client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
