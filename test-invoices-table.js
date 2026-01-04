const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing invoices table...');
console.log('URL:', SUPABASE_URL);
console.log('Key exists:', !!SUPABASE_ANON_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  try {
    // Try to fetch invoices
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error:', error.message);
      console.error('Full error:', error);
    } else {
      console.log('Success! Found invoices:', data?.length || 0);
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Exception:', err.message);
  }
})();
