const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ifyvyzqlsxqbkrrwyqon.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmeXZ5enFsc3hxYmtycnd5cW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNDUwNzgsImV4cCI6MjA0ODcyNTA3OH0.h-rVDHpQ6Ux3gOccN7VCMDnQQN3MhRHVhWCpd_X7RAI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLineItems() {
  console.log('Fetching line item codes...');
  const { data: codes, error: codesError } = await supabase
    .from('line_item_codes')
    .select('*')
    .order('code');

  if (codesError) {
    console.error('Error fetching codes:', codesError);
    return;
  }

  console.log('Line item codes:');
  codes.forEach(code => {
    console.log(`  ${code.id}: ${code.code} - ${code.description}`);
  });

  console.log('\nFetching shifts...');
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('*')
    .limit(5);

  if (shiftsError) {
    console.error('Error fetching shifts:', shiftsError);
    return;
  }

  console.log('Shifts (first 5):');
  shifts.forEach(shift => {
    console.log(`  line_item_code_id: ${shift.line_item_code_id}`);
    const found = codes.find(c => c.id === shift.line_item_code_id);
    console.log(`    -> Found: ${found ? found.code : 'NOT FOUND'}`);
  });
}

testLineItems();
