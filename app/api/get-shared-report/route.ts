import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/lib/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export async function GET(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are not set.' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const shareToken = searchParams.get('token')

    if (!shareToken) {
      return NextResponse.json({ error: 'Missing share token' }, { status: 400 })
    }

    console.log('Looking for share token:', shareToken)

    // Use service role key to read shared reports (bypasses RLS)
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY)

    // Get the shared report by token (public access, no auth required)
    const { data: sharedReport, error: reportError } = await supabase
      .from('shared_reports')
      .select('*')
      .eq('share_token', shareToken)
      .single() as any

    console.log('Shared report query result:', { data: sharedReport, error: reportError })

    if (reportError || !sharedReport) {
      console.error('Report not found:', reportError)
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 404 })
    }

    // Check if link has expired
    if ((sharedReport as any).expires_at && new Date((sharedReport as any).expires_at) < new Date()) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 })
    }

    // Create a service client to fetch the user's data
    const serviceSupabase = createClient<Database>(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
    )

    const reportData: any = {
      dateFrom: (sharedReport as any).date_from,
      dateTo: (sharedReport as any).date_to,
      carersReport: null,
      lineItemsReport: null,
      categoriesReport: null
    }

    // Fetch shifts data for the user
    const { data: shifts, error: shiftsError } = await serviceSupabase
      .from('shifts')
      .select('*')
      .eq('user_id', (sharedReport as any).user_id)
      .gte('shift_date', (sharedReport as any).date_from)
      .lte('shift_date', (sharedReport as any).date_to)

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError)
      return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 })
    }

    // Fetch carers data if needed
    if ((sharedReport as any).carers_report) {
      const { data: carers, error: carersError } = await serviceSupabase
        .from('carers')
        .select('*')
        .eq('user_id', (sharedReport as any).user_id)

      if (!carersError && carers) {
        reportData.carersReport = {
          shifts: shifts || [],
          carers: carers
        }
      }
    }

    // Fetch line items if needed
    if ((sharedReport as any).line_items_report) {
      const { data: lineItems, error: lineItemsError } = await serviceSupabase
        .from('line_items')
        .select('*')
        .eq('user_id', (sharedReport as any).user_id)
        .order('code')

      if (!lineItemsError && lineItems) {
        reportData.lineItemsReport = {
          shifts: shifts || [],
          lineItems: lineItems
        }
      }
    }

    // Fetch categories data if needed
    if ((sharedReport as any).categories_report) {
      reportData.categoriesReport = {
        shifts: shifts || []
      }
    }

    // Update access count and last_accessed_at
    await (serviceSupabase as any)
      .from('shared_reports')
      .update({
        access_count: ((sharedReport as any).access_count || 0) + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', (sharedReport as any).id)

    return NextResponse.json({ 
      success: true,
      data: reportData
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching shared report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
