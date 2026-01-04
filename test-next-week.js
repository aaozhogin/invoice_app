const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const toYmdLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function testDateRange() {
  // Check for next week (Jan 5 - Jan 11)
  const dateFrom = '2026-01-05'
  const dateTo = '2026-01-11'
  
  console.log('📅 Checking date range:', { dateFrom, dateTo })
  
  const { data: shifts } = await supabase
    .from('shifts')
    .select('shift_date, time_from')
    .gte('shift_date', dateFrom)
    .lte('shift_date', dateTo)
  
  console.log('📊 Found', shifts?.length || 0, 'shifts')
  
  if (shifts && shifts.length > 0) {
    const byDate = {}
    shifts.forEach(s => {
      const date = new Date(s.time_from)
      const ymd = toYmdLocal(date)
      byDate[ymd] = (byDate[ymd] || 0) + 1
    })
    console.log('\nBy date:')
    Object.entries(byDate).sort().forEach(([date, count]) => {
      console.log(`  ${date}: ${count} shifts`)
    })
  } else {
    console.log('❌ No shifts found for this range!')
  }
}

testDateRange()
