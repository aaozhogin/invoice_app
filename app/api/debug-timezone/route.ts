import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const testTime = '2025-11-14T10:00:00+00:00' // Natalia's start time
    const date = new Date(testTime)
    
    const analysis = {
      original_time: testTime,
      parsed_date: date.toString(),
      utc_string: date.toUTCString(),
      iso_string: date.toISOString(),
      local_hours: date.getHours(),
      local_minutes: date.getMinutes(),
      utc_hours: date.getUTCHours(),
      utc_minutes: date.getUTCMinutes(),
      timezone_offset: date.getTimezoneOffset(),
      timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone,
      expected_local_time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
    }
    
    console.log('🕐 Timezone analysis:', analysis)
    
    return NextResponse.json({
      success: true,
      ...analysis
    })

  } catch (error) {
    console.error('❌ Timezone test failed:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Test failed', 
      details: error 
    })
  }
}