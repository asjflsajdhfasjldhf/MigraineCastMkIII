// API route for adding medications to migraine events

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id, name, taken_at, dose_mg, effectiveness } = body;

    if (!event_id || !name || !taken_at) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('medications')
      .insert([
        {
          event_id,
          name,
          taken_at,
          dose_mg,
          effectiveness,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Medication API error:', error);
    return NextResponse.json(
      { error: 'Failed to save medication' },
      { status: 500 }
    );
  }
}
