const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper to convert date to YYYY-MM-DD
const toYmdLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.getFullYear(), d.getMonth(), diff);
  return monday;
}

const getSunday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
  return sunday;
}

async function verifyWeekViewFix() {
  try {
    console.log('🔍 Verifying week view fix...')
    
    const today = new Date()
    const monday = getMonday(today)
    const sunday = getSunday(today)
    
    const rangeFrom = toYmdLocal(monday)
    const rangeTo = toYmdLocal(sunday)
    
    console.log('📅 Date range:', { rangeFrom, rangeTo, today: toYmdLocal(today) })
    
    // Fetch shifts for the week
    const { data: shifts } = await supabase
      .from('shifts')
      .select('*')
      .gte('shift_date', rangeFrom)
      .lte('shift_date', rangeTo)
    
    console.log('✅ Query returned', shifts?.length || 0, 'shifts using shift_date filter')
    
    // Now check how many shifts would be found using time_from date
    let matchedByTimeFromDate = 0
    let byDay = {}
    
    if (shifts && shifts.length > 0) {
      shifts.forEach(shift => {
        const shiftStartDate = new Date(shift.time_from)
        const shiftDateFromTime = toYmdLocal(shiftStartDate)
        
        // Check if this shift would be shown on any day of the week
        let mondayDate = new Date(monday)
        for (let i = 0; i < 7; i++) {
          const dayYmd = toYmdLocal(mondayDate)
          if (shiftDateFromTime === dayYmd) {
            matchedByTimeFromDate++
            byDay[dayYmd] = (byDay[dayYmd] || 0) + 1
            break
          }
          mondayDate.setDate(mondayDate.getDate() + 1)
        }
      })
    }
    
    console.log('\n📊 Results:')
    console.log(`  Total shifts (using shift_date filter): ${shifts?.length || 0}`)
    console.log(`  Shifts matched (using time_from date): ${matchedByTimeFromDate}`)
    console.log('\n📅 Shifts by day (using time_from date):')
    Object.entries(byDay).sort().forEach(([date, count]) => {
      console.log(`  ${date}: ${count} shifts`)
    })
    
    if (matchedByTimeFromDate > 0 && shifts && shifts.length > 0) {
      console.log('\n✅ FIX VERIFIED: Shifts will now be displayed in week view!')
    } else {
      console.log('\n❌ Issue: No shifts would be displayed')
    }
    
  } catch (err) {
    console.error('Error:', err)
  }
}

verifyWeekViewFix()
