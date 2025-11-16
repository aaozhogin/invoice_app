import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/app/lib/supabaseClient'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    
    console.log('Testing database connection...')
    
    // Test each table individually
    const tests = [
      { name: 'carers', query: () => supabase.from('carers').select('*').limit(1) },
      { name: 'clients', query: () => supabase.from('clients').select('*').limit(1) },
      { name: 'line_items', query: () => supabase.from('line_items').select('*').limit(1) },
      { name: 'shifts', query: () => supabase.from('shifts').select('*').limit(1) }
    ]
    
    const results = []
    
    for (const test of tests) {
      try {
        const { data, error } = await test.query()
        results.push({
          table: test.name,
          exists: !error,
          error: error?.message,
          rowCount: data?.length || 0,
          sampleData: data?.[0] || null
        })
      } catch (e) {
        results.push({
          table: test.name,
          exists: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      results
    })
    
  } catch (error) {
    console.error('Database test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}