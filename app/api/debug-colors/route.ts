import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_CARER_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f97316', // Orange
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

export async function GET(request: NextRequest) {
  try {
    console.log('🎨 Checking carer color assignments...');

    // Get all carers
    const { data: carers, error: carersError } = await supabase
      .from('carers')
      .select('id, first_name, last_name, color')
      .order('id');

    if (carersError) {
      console.error('❌ Error fetching carers:', carersError);
    }

    // Get recent shifts to see which carers have shifts
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select(`
        *, 
        carers(id, first_name, last_name, color)
      `)
      .order('shift_date', { ascending: false })
      .limit(10);

    if (shiftsError) {
      console.error('❌ Error fetching shifts:', shiftsError);
    }

    // Calculate assigned colors for each carer
    const carerColorAssignments = carers?.map(carer => ({
      id: carer.id,
      name: `${carer.first_name} ${carer.last_name}`,
      databaseColor: carer.color || null,
      fallbackColor: DEFAULT_CARER_COLORS[carer.id % DEFAULT_CARER_COLORS.length],
      finalColor: carer.color || DEFAULT_CARER_COLORS[carer.id % DEFAULT_CARER_COLORS.length]
    })) || [];

    return NextResponse.json({
      success: true,
      carers: carerColorAssignments,
      recentShifts: shifts?.map(shift => ({
        id: shift.id,
        date: shift.shift_date,
        time: `${shift.time_from} - ${shift.time_to}`,
        carer: shift.carers ? `${shift.carers.first_name} ${shift.carers.last_name}` : 'Unknown',
        carer_id: shift.carer_id,
        assignedColor: shift.carers?.color || DEFAULT_CARER_COLORS[shift.carer_id % DEFAULT_CARER_COLORS.length]
      })) || [],
      defaultColors: DEFAULT_CARER_COLORS,
      note: carersError ? 'Color column missing from database' : 'All data retrieved successfully'
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