import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Adding color column to carers table...');

    // Try to manually execute the SQL via a SQL query
    // This is a workaround since we can't use psql directly
    const alterTableSQL = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'carers' AND column_name = 'color'
        ) THEN
          ALTER TABLE carers ADD COLUMN color TEXT DEFAULT '#22c55e';
        END IF;
      END $$;
    `;

    // Since we can't execute raw SQL directly, let's check if we have service role access
    // and try a different approach
    
    console.log('ℹ️ Manual intervention required:');
    console.log('Please execute the following SQL in your Supabase dashboard:');
    console.log(alterTableSQL);
    
    // Try to detect if column exists by selecting data
    const { data: testData, error: testError } = await supabase
      .from('carers')
      .select('*')
      .limit(1);

    if (testData && testData.length > 0) {
      const sampleCarer = testData[0];
      const hasColorColumn = 'color' in sampleCarer;
      
      if (hasColorColumn) {
        console.log('✅ Color column already exists!');
        return NextResponse.json({
          success: true,
          message: 'Color column already exists',
          sampleCarer: sampleCarer
        });
      } else {
        console.log('❌ Color column missing');
        return NextResponse.json({
          success: false,
          message: 'Color column missing. Please add it manually via Supabase dashboard',
          sql: alterTableSQL,
          sampleCarer: sampleCarer
        });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'No carers found to test column existence',
      sql: alterTableSQL
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