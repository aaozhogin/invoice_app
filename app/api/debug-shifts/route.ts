import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking shift data structure...');

    // Get recent shifts with all available joins
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select(`
        *, 
        carers(id, first_name, last_name, email, color), 
        line_items(id, code, category, description, billed_rate)
      `)
      .order('shift_date', { ascending: false })
      .limit(5);

    if (shiftsError) {
      console.error('❌ Error fetching shifts:', shiftsError);
      return NextResponse.json({ 
        success: false, 
        error: 'Could not fetch shifts', 
        details: shiftsError 
      });
    }

    // Get all clients for reference
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('id');

    // Get all line items for reference  
    const { data: lineItems, error: lineItemsError } = await supabase
      .from('line_items')
      .select('*')
      .order('id');

    console.log('✅ Shift data:', shifts);
    console.log('✅ Clients:', clients);
    console.log('✅ Line items:', lineItems);

    return NextResponse.json({
      success: true,
      shifts: shifts,
      clients: clients,
      lineItems: lineItems,
      analysis: shifts?.map(shift => ({
        shift_id: shift.id,
        shift_date: shift.shift_date,
        client_id: shift.client_id,
        line_item_code_id: shift.line_item_code_id,
        has_carer_data: !!shift.carers,
        has_line_item_data: !!shift.line_items,
        carer_name: shift.carers ? `${shift.carers.first_name} ${shift.carers.last_name}` : null,
        line_item_category: shift.line_items?.category || null
      })) || []
    });

  } catch (error) {
    console.error('❌ Operation failed:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Operation failed', 
      details: error 
    });
  }
}