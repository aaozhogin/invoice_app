import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('saved_calendars')
      .select('id, name, date_from, date_to, client_id, created_at, config')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error listing saved calendars:', error)
    return NextResponse.json({ error: 'Failed to load saved calendars' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { name, date_from, date_to, client_id, config } = payload || {}

    if (!name || !config) {
      return NextResponse.json({ error: 'Name and config are required' }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('saved_calendars')
      .upsert({ name, date_from, date_to, client_id, config }, { onConflict: 'name' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error saving calendar:', error)
    return NextResponse.json({ error: 'Failed to save calendar' }, { status: 500 })
  }
}
