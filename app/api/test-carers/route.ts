import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // Test 1: Check if carers table exists and get sample data
    console.log('🔍 Checking carers table...');
    const { data: carers, error: carersError } = await supabase
      .from('carers')
      .select('*')
      .limit(5);

    if (carersError) {
      console.error('❌ Carers query failed:', carersError);
      return NextResponse.json({ 
        error: 'Carers query failed', 
        details: carersError 
      });
    }

    console.log('✅ Sample carers data:', carers);
    
    // Test 2: Check if color column exists by trying to select only specific fields
    const { data: colorTest, error: colorError } = await supabase
      .from('carers')
      .select('id, first_name, last_name, color')
      .limit(3);

    if (colorError) {
      console.error('❌ Color column test failed:', colorError);
    } else {
      console.log('✅ Color column test passed:', colorTest);
    }

    return NextResponse.json({
      success: true,
      carersCount: carers?.length || 0,
      sampleCarers: carers,
      colorTest: colorTest,
      colorError: colorError?.message || null
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error 
    });
  }
}