import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export async function POST() {
  try {
    console.log('🔧 Adding client_id column to shifts table...')
    
    const supabase = getSupabaseClient()
    
    // Check current table structure
    const { data: existingShifts, error: checkError } = await supabase
      .from('shifts')
      .select('*')
      .limit(1)
    
    if (checkError) {
      console.error('Error checking shifts table:', checkError)
      return NextResponse.json({ error: 'Failed to check shifts table', details: checkError }, { status: 500 })
    }
    
    if (existingShifts && existingShifts.length > 0) {
      const columns = Object.keys(existingShifts[0])
      console.log('Current columns:', columns)
      
      if (columns.includes('client_id')) {
        return NextResponse.json({ 
          success: true, 
          message: 'client_id column already exists',
          columns: columns 
        })
      }
    }
    
    console.log('Adding client_id column...')
    
    // Execute the ALTER TABLE command using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.shifts 
        ADD COLUMN IF NOT EXISTS client_id BIGINT REFERENCES public.clients(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS shifts_client_id_idx ON public.shifts (client_id);
      `
    })
    
    if (error) {
      console.error('Error executing SQL:', error)
      
      // If RPC doesn't work, we might need to use the Supabase admin client
      // For now, let's try a different approach - use the built-in schema management
      
      return NextResponse.json({ 
        error: 'Cannot add client_id column with current permissions',
        suggestion: 'Need to add column through Supabase dashboard or with service role key',
        details: error
      }, { status: 500 })
    }
    
    // Verify the column was added
    const { data: updatedShifts, error: verifyError } = await supabase
      .from('shifts')
      .select('*')
      .limit(1)
    
    if (verifyError) {
      return NextResponse.json({ error: 'Failed to verify column addition', details: verifyError }, { status: 500 })
    }
    
    const newColumns = updatedShifts && updatedShifts.length > 0 ? Object.keys(updatedShifts[0]) : []
    
    return NextResponse.json({ 
      success: true,
      message: 'client_id column added successfully',
      newColumns: newColumns,
      hasClientId: newColumns.includes('client_id')
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to add client_id column to shifts table',
    usage: 'curl -X POST http://localhost:3000/api/add-client-id-column'
  })
}