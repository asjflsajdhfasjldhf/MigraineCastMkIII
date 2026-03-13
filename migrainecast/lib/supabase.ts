// Supabase client setup and database utilities

import { createClient } from '@supabase/supabase-js';
import {
  MigraineEvent,
  Medication,
  EnvironmentSnapshot,
  PersonalFactors,
  UserSettings,
} from '@/types';
import { PERSONAL_DEFAULTS } from '@/lib/krii-config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const publicSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl;
const publicSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;

if (!publicSupabaseUrl || !publicSupabaseAnonKey) {
  console.warn(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY - using placeholder values for build'
  );
}

export const supabase = createClient(
  publicSupabaseUrl || 'https://placeholder.supabase.co',
  publicSupabaseAnonKey || 'placeholder-key'
);

/**
 * Get all migraine events
 */
export async function getMigraineEvents(): Promise<MigraineEvent[]> {
  try {
    const { data, error } = await supabase
      .from('migraine_events')
      .select('*')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Query failed: migraine_events select order by started_at', error);
      throw error;
    }

    console.error('Debug: migraine_events rows loaded', (data || []).length);
    return data || [];
  } catch (error) {
    console.error('Error fetching migraine events:', error);
    throw error;
  }
}

/**
 * Get a single migraine event with all related data
 */
export async function getMigraineEvent(eventId: string): Promise<{
  event: MigraineEvent;
  medications: Medication[];
  environment: EnvironmentSnapshot | null;
  personal: PersonalFactors | null;
}> {
  try {
    const { data: event, error: eventError } = await supabase
      .from('migraine_events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    const [{ data: medications }, { data: environment }, { data: personal }] =
      await Promise.all([
        supabase.from('medications').select('*').eq('event_id', eventId),
        supabase
          .from('environment_snapshots')
          .select('*')
          .eq('event_id', eventId)
          .single(),
        supabase
          .from('personal_factors')
          .select('*')
          .eq('event_id', eventId)
          .single(),
      ]);

    return {
      event,
      medications: medications || [],
      environment: environment || null,
      personal: personal || null,
    };
  } catch (error) {
    console.error('Error fetching migraine event:', error);
    throw error;
  }
}

/**
 * Create a new migraine event
 */
export async function createMigraineEvent(
  event: Omit<MigraineEvent, 'id' | 'created_at'>
): Promise<MigraineEvent> {
  try {
    const { data, error } = await supabase
      .from('migraine_events')
      .insert([event])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating migraine event:', error);
    throw error;
  }
}

/**
 * Update a migraine event
 */
export async function updateMigraineEvent(
  eventId: string,
  updates: Partial<MigraineEvent>
): Promise<MigraineEvent> {
  try {
    const { data, error } = await supabase
      .from('migraine_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating migraine event:', error);
    throw error;
  }
}

/**
 * Add medication to an event
 */
export async function addMedication(
  medication: Omit<Medication, 'id' | 'created_at'>
): Promise<Medication> {
  try {
    const { data, error } = await supabase
      .from('medications')
      .insert([medication])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding medication:', error);
    throw error;
  }
}

/**
 * Add environment snapshot
 */
export async function addEnvironmentSnapshot(
  snapshot: Omit<EnvironmentSnapshot, 'id' | 'created_at'>
): Promise<EnvironmentSnapshot> {
  try {
    const { data, error } = await supabase
      .from('environment_snapshots')
      .insert([snapshot])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding environment snapshot:', error);
    throw error;
  }
}

/**
 * Add personal factors
 */
export async function addPersonalFactors(
  factors: Omit<PersonalFactors, 'id' | 'created_at'>
): Promise<PersonalFactors> {
  try {
    const { data, error } = await supabase
      .from('personal_factors')
      .insert([factors])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding personal factors:', error);
    throw error;
  }
}

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<UserSettings> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('key, value');

    if (error) throw error;

    const settings: Partial<UserSettings> = {};
    for (const row of data || []) {
      settings[row.key as keyof UserSettings] = row.value;
    }

    return {
      location_lat: settings.location_lat || '52.52',
      location_lon: settings.location_lon || '13.405',
      location_name: settings.location_name || 'Berlin',
      email_notifications: settings.email_notifications || 'true',
      sleep_hours_default: PERSONAL_DEFAULTS.sleep_hours_default,
      chronotype: PERSONAL_DEFAULTS.chronotype,
    };
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
}

/**
 * Update a user setting
 */
export async function updateUserSetting(
  key: string,
  value: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating user setting:', error);
    throw error;
  }
}

/**
 * Get open migraine events (stage !== 'complete')
 */
export async function getOpenMigraineEvents(): Promise<MigraineEvent[]> {
  try {
    const { data, error } = await supabase
      .from('migraine_events')
      .select('*')
      .neq('stage', 'complete')
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Query failed: migraine_events open events', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching open migraine events:', error);
    throw error;
  }
}

/**
 * Get migraine events within a date range
 */
export async function getMigraineEventsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<MigraineEvent[]> {
  try {
    const { data, error } = await supabase
      .from('migraine_events')
      .select('*')
      .gte('started_at', startDate.toISOString())
      .lte('started_at', endDate.toISOString())
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Query failed: migraine_events by date range', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching migraine events by date range:', error);
    throw error;
  }
}

/**
 * Returns true when a location was explicitly stored by the user.
 */
export async function hasStoredLocationSettings(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('key')
      .in('key', ['location_lat', 'location_lon'])
      .limit(2);

    if (error) {
      console.error('Query failed: user_settings location keys', error);
      return false;
    }

    const keys = new Set((data || []).map((row) => row.key));
    return keys.has('location_lat') && keys.has('location_lon');
  } catch (error) {
    console.error('Error checking stored location settings:', error);
    return false;
  }
}

/**
 * Get medications for an event
 */
export async function getMedicationsForEvent(
  eventId: string
): Promise<Medication[]> {
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('event_id', eventId)
      .order('taken_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching medications:', error);
    throw error;
  }
}

/**
 * Update personal factors
 */
export async function updatePersonalFactors(
  factorId: string,
  updates: Partial<PersonalFactors>
): Promise<PersonalFactors> {
  try {
    const { data, error } = await supabase
      .from('personal_factors')
      .update(updates)
      .eq('id', factorId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating personal factors:', error);
    throw error;
  }
}
