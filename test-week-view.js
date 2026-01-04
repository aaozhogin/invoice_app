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

async function testWeekView() {
  try {
    console.log('🔍 Testing week view shifts...')
    
    const today = new Date()
    const monday = getMonday(today)
    const sunday = getSunday(today)
    
    const rangeFrom = toYmdLocal(monday)
    const rangeTo = toYmdLocal(sunday)
    
    console.log('📅 Date range:', { rangeFrom, rangeTo, today: toYmdLocal(today) })
    
    // Fetch shifts for the week
    const { data: shifts, error } = await supabase
      .from('shifts')
      .select(`
        *,
        carers(id, first_name, last_name, email, color),
        clients(id, first_name, last_name),
        line_items(id, code, category, description, billed_rate)
      `)
      .gte('shift_date', rangeFrom)
      .lte('shift_date', rangeTo)
    
    if (error) {
      console.error('❌ Error fetching shifts:', error)
      return
    }
    
    console.log('📊 Found', shifts?.length || 0, 'shifts for the week')
    
    if (shifts && shifts.length > 0) {
      console.log('📝 Sample shifts:')
      shifts.slice(0, 5).forEach(shift => {
        console.log(`  - ${shift.shift_date}: ${shift.carers?.first_name} ${shift.time_from} (client_id: ${shift.client_id})`)
      })
    } else {
      console.log('⚠️ No shifts found for this week!')
    }
    
    // Check unique client IDs in the shifts
    if (shifts && shifts.length > 0) {
      const clientIds = [...new Set(shifts.map(s => s.client_id))]
      console.log('\n📋 Unique client IDs in shifts:', clientIds)
    }
    
    // Get all clients
    const { data: allClients } = await supabase.from('clients').select('id, first_name, last_name')
    if (allClients) {
      console.log('\n👥 All clients:')
      allClients.forEach(c => {
        console.log(`  ${c.id}: ${c.first_name} ${c.last_name}`)
      })
    }
    
    // Check total shifts in database
    const { data: allShifts, error: allError } = await supabase
      .from('shifts')
      .select('shift_date')
      .limit(100)
    
    if (!allError && allShifts) {
      console.log('\n📊 Sample of all shifts in database:')
      // Group by date
      const byDate = {}
      allShifts.forEach(s => {
        byDate[s.shift_date] = (byDate[s.shift_date] || 0) + 1
      })
      
      Object.entries(byDate).sort().slice(0, 10).forEach(([date, count]) => {
        console.log(`  ${date}: ${count} shifts`)
      })
    }
    
  } catch (err) {
    console.error('❌ Error:', err)
  }
}

testWeekView()
