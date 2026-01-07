import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/lib/types/supabase'
import getSupabaseClient from '@/app/lib/supabaseClient'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function GET(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are not set.' }, { status: 500 })
  }

  try {
    // Get the authenticated user's session to filter by user_id
    const supabaseAuth = getSupabaseClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        carers:carer_id(id, first_name, last_name),
        clients:client_id(id, first_name, last_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Calculate total amount for each invoice by summing shift costs
    const invoicesWithTotals = await Promise.all((data || []).map(async (invoice: any) => {
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('cost')
        .eq('user_id', user.id)
        .eq('carer_id', invoice.carer_id)
        .eq('client_id', invoice.client_id)
        .gte('shift_date', invoice.date_from)
        .lte('shift_date', invoice.date_to)

      if (shiftsError) {
        console.error('Error fetching shifts for invoice:', shiftsError)
        return { ...invoice, total_amount: 0 }
      }

      const total = (shifts || []).reduce((sum: number, shift: any) => sum + (shift.cost || 0), 0)
      return { ...invoice, total_amount: total }
    }))

    return NextResponse.json({ data: invoicesWithTotals }, { status: 200 })
  } catch (err) {
    console.error('Error fetching invoices:', err)
    return NextResponse.json({ error: 'Failed to fetch invoices.' }, { status: 500 })
  }
}
