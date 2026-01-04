const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

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
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

const getSunday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

async function testWeekViewLogic() {
  const today = new Date()
  const monday = getMonday(today)
  const sunday = getSunday(today)
  const rangeFrom = toYmdLocal(monday)
  const rangeTo = toYmdLocal(sunday)
  
  console.log('📅 Week range:', { rangeFrom, rangeTo })
  
  // Simulate the fetchData function
  const { data: rangeShiftsRes } = await supabase
    .from('shifts')
    .select(`
      *,
      carers(id, first_name, last_name, email, color),
      clients(id, first_name, last_name),
      line_items(id, code, category, description, billed_rate)
    `)
    .gte('shift_date', rangeFrom)
    .lte('shift_date', rangeTo)
  
  console.log('\n1️⃣ Raw shifts from database:', rangeShiftsRes?.length || 0)
  
  // Simulate client filter - let's say we have a random selectedClientId
  const selectedClientId = Math.random() > 0.5 ? 4 : null
  console.log('2️⃣ Selected client ID:', selectedClientId)
  
  const filteredRangeShifts = (rangeShiftsRes || []).filter(
    s => !selectedClientId || s.client_id === selectedClientId
  )
  console.log('3️⃣ After client filter:', filteredRangeShifts.length)
  
  // Simulate shift rendering - apply the time_from date filter
  let totalShiftsInWeek = 0
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(dayDate.getDate() + i);
    const dayYmd = toYmdLocal(dayDate);
    
    const dayShifts = filteredRangeShifts.filter(s => {
      const shiftStartDate = new Date(s.time_from);
      const shiftDateFromTime = toYmdLocal(shiftStartDate);
      return shiftDateFromTime === dayYmd;
    })
    
    totalShiftsInWeek += dayShifts.length
    console.log(`   ${dayYmd}: ${dayShifts.length} shifts`)
  }
  
  console.log('\n✅ Total shifts displayed:', totalShiftsInWeek)
  
  if (filteredRangeShifts.length > 0 && totalShiftsInWeek === 0) {
    console.log('❌ PROBLEM: Shifts exist but are filtered out by date!')
  } else if (filteredRangeShifts.length === 0 && (rangeShiftsRes?.length ?? 0) > 0) {
    console.log('❌ PROBLEM: Selected client has no shifts!')
  } else if (totalShiftsInWeek === 0) {
    console.log('❌ PROBLEM: No shifts in database for this week!')
  } else {
    console.log('✅ Everything looks good!')
  }
}

testWeekViewLogic()
