import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/lib/types/supabase'

function getServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set')
  }
  return createClient<Database>(supabaseUrl, supabaseKey)
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getServerSupabase()
    const { data, error } = await supabase
      .from('saved_calendars')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error loading saved calendar:', error)
    return NextResponse.json({ error: 'Failed to load saved calendar' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = getServerSupabase()
    const { error } = await supabase
      .from('saved_calendars')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message || 'Unknown Supabase error')

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting saved calendar:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete saved calendar'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
