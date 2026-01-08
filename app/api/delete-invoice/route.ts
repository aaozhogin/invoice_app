import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/lib/types/supabase'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

export async function DELETE(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: 'Supabase environment variables are not set.' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const invoiceId = searchParams.get('id')

  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID is required.' }, { status: 400 })
  }

  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Get authenticated user first
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete invoice scoped to current user
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('user_id', authData.user.id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Error deleting invoice:', err)
    return NextResponse.json({ error: 'Failed to delete invoice.' }, { status: 500 })
  }
}
