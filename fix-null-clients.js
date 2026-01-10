const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNullClients() {
  try {
    // First, find Alexis Lysenko's client ID
    const { data: alexisClients, error: findError } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('first_name', 'Alexis')
      .eq('last_name', 'Lysenko')
      .limit(1);

    if (findError) throw findError;
    if (!alexisClients || alexisClients.length === 0) {
      console.error('Alexis Lysenko not found in clients table');
      process.exit(1);
    }

    const alexisId = alexisClients[0].id;
    console.log(`Found Alexis Lysenko with ID: ${alexisId}`);

    // Find shifts with NULL client_id
    const { data: nullClientShifts, error: findShiftsError } = await supabase
      .from('shifts')
      .select('id, shift_date, time_from, time_to, carer_id, client_id')
      .is('client_id', null);

    if (findShiftsError) throw findShiftsError;
    
    if (!nullClientShifts || nullClientShifts.length === 0) {
      console.log('No shifts with NULL client_id found');
      return;
    }

    console.log(`Found ${nullClientShifts.length} shifts with NULL client_id`);
    console.log('Sample shifts:', nullClientShifts.slice(0, 3));

    // Update all shifts with NULL client_id to Alexis Lysenko
    const { data, error } = await supabase
      .from('shifts')
      .update({ client_id: alexisId })
      .is('client_id', null);

    if (error) throw error;

    console.log(`✅ Successfully updated ${nullClientShifts.length} shifts to client_id: ${alexisId}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixNullClients();
