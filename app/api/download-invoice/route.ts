import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/lib/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function GET(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are not set.' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const invoiceNumber = searchParams.get('number')
  const invoiceDate = searchParams.get('date')

  if (!invoiceNumber || !invoiceDate) {
    return NextResponse.json({ error: 'Invoice number and date are required.' }, { status: 400 })
  }

  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Find the invoice record
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('invoice_number', invoiceNumber)
      .eq('invoice_date', invoiceDate)
      .limit(1)

    if (invoiceError || !invoices?.[0]) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 })
    }

    const invoice = invoices[0] as Database['public']['Tables']['invoices']['Row']

    // Regenerate the invoice by calling the generate-invoice endpoint internally
    // Get the base URL for the current request
    const requestUrl = new URL(req.url)
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`
    
    const generateRes = await fetch(`${baseUrl}/api/generate-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoiceDate: invoice.invoice_date,
        invoiceNumber: invoice.invoice_number,
        carerIds: [invoice.carer_id],
        clientId: invoice.client_id,
        dateFrom: invoice.date_from,
        dateTo: invoice.date_to,
        timezoneOffset: 0 // Use server timezone for regenerated invoices
      })
    })

    if (!generateRes.ok) {
      throw new Error('Failed to generate invoice file')
    }

    const json = await generateRes.json()
    
    // Return the base64 file data as JSON so the client can handle it
    return NextResponse.json({
      success: true,
      file: {
        name: json.file.name,
        data: json.file.data,
        mimeType: json.file.mimeType
      }
    })
  } catch (err) {
    console.error('Error downloading invoice:', err)
    return NextResponse.json({ error: 'Failed to download invoice.' }, { status: 500 })
  }
}
