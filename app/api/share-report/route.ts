import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/lib/types/supabase'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are not set.' }, { status: 500 })
  }

  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Get the user from the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { carersReport, lineItemsReport, categoriesReport, dateFrom, dateTo } = body

    if (!dateFrom || !dateTo) {
      return NextResponse.json({ error: 'Missing date range' }, { status: 400 })
    }

    if (!carersReport && !lineItemsReport && !categoriesReport) {
      return NextResponse.json({ error: 'At least one report must be selected' }, { status: 400 })
    }

    // Generate a unique share token
    const shareToken = generateShareToken()

    // Insert into shared_reports table
    const { data, error } = await (supabase as any)
      .from('shared_reports')
      .insert([
        {
          user_id: user.id,
          share_token: shareToken,
          carers_report: carersReport,
          line_items_report: lineItemsReport,
          categories_report: categoriesReport,
          date_from: dateFrom,
          date_to: dateTo,
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days from now
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Generate the shareable URL
    const baseUrl = req.headers.get('origin') || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/shared-report/${shareToken}`

    return NextResponse.json({ 
      success: true,
      shareUrl,
      shareToken
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating share link:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
