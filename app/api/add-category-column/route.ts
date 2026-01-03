import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    console.log('Adding category column to shifts table...');

    // Step 1: Add category column
    const { error: addColumnError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE shifts ADD COLUMN IF NOT EXISTS category VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_shifts_category ON shifts(category);
      `
    });

    if (addColumnError) {
      console.error('Error adding column:', addColumnError);
      // Try alternative approach using raw SQL
      const { error: altError } = await supabase.from('shifts').select('category').limit(1);
      
      if (altError && altError.message.includes('column "category" does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Cannot add category column. Please run the migration manually in Supabase SQL Editor.',
          sql: `
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS category VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_shifts_category ON shifts(category);
UPDATE shifts SET category = 'HIREUP' WHERE line_item_code_id IS NULL AND cost > 0;
          `
        });
      }
    }

    console.log('Category column added successfully');

    // Step 2: Update existing HIREUP shifts
    const { data: hireupShifts, error: updateError } = await supabase
      .from('shifts')
      .update({ category: 'HIREUP' })
      .is('line_item_code_id', null)
      .gt('cost', 0)
      .select();

    if (updateError) {
      console.error('Error updating HIREUP shifts:', updateError);
      return NextResponse.json({
        success: false,
        error: updateError.message
      });
    }

    console.log(`Updated ${hireupShifts?.length || 0} HIREUP shifts`);

    return NextResponse.json({
      success: true,
      message: 'Category column added successfully',
      updatedShifts: hireupShifts?.length || 0
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
