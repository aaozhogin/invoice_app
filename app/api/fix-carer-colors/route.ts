import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export async function GET() {
  return await POST()
}

export async function POST() {
  try {
    const supabase = getSupabaseClient()
    
    // Update all carers without colors to have a default blue color
    const { data, error } = await supabase
      .from('carers')
      .update({ color: '#3b82f6' })
      .is('color', null)
      .select()
    
    if (error) {
      console.error('Error updating carer colors:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('Updated carers with default colors:', data)
    
    return NextResponse.json({ 
      success: true, 
      message: `Updated ${data?.length || 0} carers with default colors`,
      data
    })
  } catch (error) {
    console.error('Error in fix-carer-colors:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}