import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Applying carer color migration...');
    
    // Add color column to carers table
    const { data: addColumnData, error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE carers 
        ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#22c55e';
      `
    });

    if (addColumnError) {
      console.error('❌ Failed to add color column:', addColumnError);
      
      // Try alternative approach - direct SQL execution
      try {
        const { data: directData, error: directError } = await supabase
          .from('carers')
          .select('id, color')
          .limit(1);
        
        if (directError && directError.code === '42703') {
          // Column doesn't exist, we need to add it differently
          console.log('🔄 Trying to add column via direct query...');
          
          // Since we can't use ALTER TABLE directly, let's try a workaround
          return NextResponse.json({
            success: false,
            error: 'Cannot add column via Supabase client',
            message: 'The color column needs to be added via database admin panel or direct psql access',
            addColumnError: addColumnError,
            directError: directError
          });
        }
      } catch (e) {
        console.error('Direct query also failed:', e);
      }
    } else {
      console.log('✅ Color column added successfully');
    }

    // Update existing carers to have default colors
    const { data: updateData, error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE carers 
        SET color = '#22c55e'
        WHERE color IS NULL;
      `
    });

    if (updateError) {
      console.error('❌ Failed to update existing carers:', updateError);
    } else {
      console.log('✅ Updated existing carers with default color');
    }

    // Test if the column exists now
    const { data: testData, error: testError } = await supabase
      .from('carers')
      .select('id, first_name, last_name, color')
      .limit(3);

    return NextResponse.json({
      success: !addColumnError && !updateError,
      addColumnResult: addColumnData,
      addColumnError: addColumnError?.message,
      updateResult: updateData,
      updateError: updateError?.message,
      testData: testData,
      testError: testError?.message
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Migration failed', 
      details: error 
    });
  }
}