const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

(async () => {
  const { data } = await supabase.from('shifts').select('*').limit(10)
  console.log('Sample shifts with client_id:')
  data?.forEach(s => console.log(`  id: ${s.id}, client_id: ${s.client_id}`))
  
  const { data: clients } = await supabase.from('clients').select('id, first_name').limit(10)
  console.log('\nClients:')
  clients?.forEach(c => console.log(`  id: ${c.id}, name: ${c.first_name}`))
})()
