import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/lib/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

interface SaveInvoiceRequest {
  invoiceNumber: string
  carerId: number
  clientId: number
  dateFrom: string
  dateTo: string
  invoiceDate: string
  fileName: string
  filePath: string
}

export async function POST(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are not set.' }, { status: 500 })
  }

  let body: SaveInvoiceRequest
  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  try {
    // Use any to bypass type checking issues with invoices table
    const supabase: any = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: body.invoiceNumber,
        carer_id: body.carerId,
        client_id: body.clientId,
        date_from: body.dateFrom,
        date_to: body.dateTo,
        invoice_date: body.invoiceDate,
        file_name: body.fileName,
        file_path: body.filePath
      })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (err) {
    console.error('Error saving invoice:', err)
    return NextResponse.json({ error: 'Failed to save invoice record.' }, { status: 500 })
  }
}
