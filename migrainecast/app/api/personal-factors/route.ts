// API route for adding personal factors to migraine events

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      event_id,
      sleep_hours,
      sleep_bedtime,
      sleep_waketime,
      stress_level,
      alcohol_yesterday,
      caffeine_withdrawal,
      meals_regular,
      hydration,
      sensory_overload,
      masking_intensity,
      social_exhaustion,
      overstimulation,
    } = body;

    if (!event_id) {
      return NextResponse.json(
        { error: 'Missing event_id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('personal_factors')
      .insert([
        {
          event_id,
          sleep_hours,
          sleep_bedtime,
          sleep_waketime,
          stress_level,
          alcohol_yesterday,
          caffeine_withdrawal,
          meals_regular,
          hydration,
          sensory_overload,
          masking_intensity,
          social_exhaustion,
          overstimulation,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('Personal factors API error:', error);
    return NextResponse.json(
      { error: 'Failed to save personal factors' },
      { status: 500 }
    );
  }
}
