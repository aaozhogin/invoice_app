import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Attempting to add color column to carers table...');
    
    // First, let's check current carers and manually add a color field to existing ones
    const { data: carers, error: carersError } = await supabase
      .from('carers')
      .select('id, first_name, last_name')
      .order('id');

    if (carersError) {
      console.error('❌ Error fetching carers:', carersError);
      return NextResponse.json({ 
        success: false, 
        error: 'Could not fetch carers', 
        details: carersError 
      });
    }

    console.log('✅ Found carers:', carers);

    // Default colors to assign to existing carers
    const defaultColors = [
      '#3b82f6', '#22c55e', '#8b5cf6', '#ec4899', 
      '#f97316', '#ef4444', '#14b8a6', '#6366f1'
    ];

    // Try to update each carer with a color (this will work if the column exists)
    const updateResults = [];
    for (let i = 0; i < carers.length; i++) {
      const carer = carers[i];
      const color = defaultColors[i % defaultColors.length];
      
      try {
        const { data, error } = await supabase
          .from('carers')
          .update({ color: color })
          .eq('id', carer.id)
          .select();
          
        if (error) {
          console.error(`❌ Error updating carer ${carer.id}:`, error);
          updateResults.push({ 
            carer_id: carer.id, 
            success: false, 
            error: error.message 
          });
        } else {
          console.log(`✅ Updated carer ${carer.id} with color ${color}`);
          updateResults.push({ 
            carer_id: carer.id, 
            success: true, 
            color: color 
          });
        }
      } catch (updateError) {
        console.error(`❌ Exception updating carer ${carer.id}:`, updateError);
        updateResults.push({ 
          carer_id: carer.id, 
          success: false, 
          error: 'Exception occurred' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Attempted to add colors to carers',
      carers: carers,
      updateResults: updateResults,
      note: 'If updates failed, the color column needs to be added to the database schema first'
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