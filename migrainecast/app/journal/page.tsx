// Journal Page
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { JournalForm } from '@/components/journal/JournalForm';
import { JournalList } from '@/components/journal/JournalList';
import { EventDetail } from '@/components/journal/EventDetail';
import {
  getMigraineEvents,
  getMigraineEvent,
  createMigraineEvent,
  updateMigraineEvent,
  addEnvironmentSnapshot,
  addPersonalFactors,
  getUserSettings,
} from '@/lib/supabase';
import { MigraineEvent, EnvironmentSnapshot, PersonalFactors } from '@/types';
import { getHistoricalWeather, calculatePressureTrend } from '@/lib/weather';
import { getHistoricalAirQuality } from '@/lib/air-quality';

export default function JournalPage() {
  const [events, setEvents] = useState<MigraineEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{
    event: MigraineEvent;
    medications: any[];
    environment: EnvironmentSnapshot | null;
    personal: PersonalFactors | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const fetchedEvents = await getMigraineEvents();
        setEvents(fetchedEvents);
        setLoading(false);
      } catch (error) {
        console.error('Error loading events:', error);
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  useEffect(() => {
    const loadSelectedEvent = async () => {
      if (!selectedEventId) {
        setSelectedEvent(null);
        return;
      }

      try {
        const event = await getMigraineEvent(selectedEventId);
        setSelectedEvent(event);
      } catch (error) {
        console.error('Error loading event:', error);
      }
    };

    loadSelectedEvent();
  }, [selectedEventId]);

  const handleSaveForm = async (data: any) => {
    try {
      setIsSaving(true);

      if (!selectedEventId) {
        // Create new event
        const newEvent = await createMigraineEvent(data);
        setSelectedEventId(newEvent.id);
        setEvents([newEvent, ...events]);

        // If stage is onset, automatically fetch environmental data
        if (data.stage === 'onset') {
          try {
            const settings = await getUserSettings();
            const lat = parseFloat(settings.location_lat);
            const lon = parseFloat(settings.location_lon);

            const historical = await getHistoricalWeather(lat, lon, new Date(data.started_at));
            const aqData = await getHistoricalAirQuality(lat, lon, new Date(data.started_at));

            const env: EnvironmentSnapshot = {
              id: '',
              event_id: newEvent.id,
              recorded_at: data.started_at,
              lat,
              lon,
              pressure: null,
              pressure_trend: null,
              pressure_change_6h: null,
              pressure_change_24h: null,
              pressure_6h_ago: historical.pressure_6h_ago,
              pressure_12h_ago: historical.pressure_12h_ago,
              pressure_24h_ago: historical.pressure_24h_ago,
              pressure_48h_ago: historical.pressure_48h_ago,
              temperature: null,
              temperature_absolute: null,
              temp_change_6h: null,
              humidity: null,
              wind_speed: null,
              uv_index: null,
              air_quality_pm25: aqData.pm25,
              air_quality_no2: aqData.no2,
              air_quality_ozone: aqData.ozone,
              hour_of_day: new Date(data.started_at).getHours(),
              season: getSeason(new Date(data.started_at)),
              created_at: new Date().toISOString(),
            };

            await addEnvironmentSnapshot(env);
          } catch (error) {
            console.error('Error fetching environmental data:', error);
          }
        }

        // If stage is active and has medications, save them
        if (data.stage === 'active' && data.medications && data.medications.length > 0) {
          try {
            for (const med of data.medications) {
              if (med.name && med.taken_at) {
                await fetch('/api/medication', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event_id: newEvent.id,
                    name: med.name,
                    taken_at: convertTimeToISO(data.ended_at, med.taken_at),
                    dose_mg: med.dose_mg,
                    effectiveness: med.effectiveness,
                  }),
                });
              }
            }
          } catch (error) {
            console.error('Error saving medications:', error);
          }
        }

        // If stage is complete, save personal factors
        if (data.stage === 'complete') {
          try {
            await fetch('/api/personal-factors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: newEvent.id,
                sleep_hours: data.sleep_hours,
                sleep_bedtime: data.sleep_bedtime,
                sleep_waketime: data.sleep_waketime,
                stress_level: data.stress_level,
                alcohol_yesterday: data.alcohol_yesterday,
                caffeine_withdrawal: data.caffeine_withdrawal,
                meals_regular: data.meals_regular,
                hydration: data.hydration,
                sensory_overload: data.sensory_overload,
                masking_intensity: data.masking_intensity,
                social_exhaustion: data.social_exhaustion,
                overstimulation: data.overstimulation,
              }),
            });
          } catch (error) {
            console.error('Error saving personal factors:', error);
          }
        }
      } else {
        // Update existing event
        const updated = await updateMigraineEvent(selectedEventId, data);
        setEvents(events.map((e) => (e.id === updated.id ? updated : e)));
        
        if (selectedEvent) {
          setSelectedEvent({
            ...selectedEvent,
            event: updated,
          });
        }

        // Handle medications for active stage
        if (data.stage === 'active' && data.medications && data.medications.length > 0) {
          try {
            for (const med of data.medications) {
              if (med.name && med.taken_at) {
                await fetch('/api/medication', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    event_id: selectedEventId,
                    name: med.name,
                    taken_at: convertTimeToISO(data.ended_at, med.taken_at),
                    dose_mg: med.dose_mg,
                    effectiveness: med.effectiveness,
                  }),
                });
              }
            }
          } catch (error) {
            console.error('Error saving medications:', error);
          }
        }

        // Handle personal factors for complete stage
        if (data.stage === 'complete') {
          try {
            await fetch('/api/personal-factors', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: selectedEventId,
                sleep_hours: data.sleep_hours,
                sleep_bedtime: data.sleep_bedtime,
                sleep_waketime: data.sleep_waketime,
                stress_level: data.stress_level,
                alcohol_yesterday: data.alcohol_yesterday,
                caffeine_withdrawal: data.caffeine_withdrawal,
                meals_regular: data.meals_regular,
                hydration: data.hydration,
                sensory_overload: data.sensory_overload,
                masking_intensity: data.masking_intensity,
                social_exhaustion: data.social_exhaustion,
                overstimulation: data.overstimulation,
              }),
            });
          } catch (error) {
            console.error('Error saving personal factors:', error);
          }
        }
      }

      setIsSaving(false);
    } catch (error) {
      console.error('Error saving event:', error);
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Lädt Journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Navigation */}
      <nav className="app-nav">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">🧠 MigraineCast</h1>
          <div className="flex gap-4">
            <Link
              href="/"
              className="nav-link"
            >
              Dashboard
            </Link>
            <Link
              href="/journal"
              className="nav-link active"
            >
              Tagebuch
            </Link>
            <Link
              href="/analysis"
              className="nav-link"
            >
              Analyse
            </Link>
            <Link
              href="/settings"
              className="nav-link"
            >
              Einstellungen
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <JournalForm
              event={selectedEvent?.event || null}
              onSave={handleSaveForm}
              isLoading={isSaving}
            />
          </div>

          {/* List */}
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Ereignisse
            </h2>
            <JournalList
              events={events}
              onSelectEvent={setSelectedEventId}
            />
          </div>
        </div>

        {/* Event Details */}
        {selectedEvent && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">
              Ereignisdetails
            </h2>
            <EventDetail
              event={selectedEvent.event}
              medications={selectedEvent.medications}
              environment={selectedEvent.environment}
              personal={selectedEvent.personal}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function getSeason(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function convertTimeToISO(dateString: string, timeString: string): string {
  // dateString format: "2026-03-06T14:30" or ISO string
  // timeString format: "14:30"
  const date = new Date(dateString);
  const [hours, minutes] = timeString.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}
