// Journal Page
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { JournalForm } from '@/components/journal/JournalForm';
import {
  RetrospectiveEntryData,
  RetrospectiveJournalForm,
} from '@/components/journal/RetrospectiveJournalForm';
import { JournalList } from '@/components/journal/JournalList';
import { EventDetail } from '@/components/journal/EventDetail';
import { Navigation } from '@/components/Navigation';
import {
  getMigraineEvents,
  getMigraineEvent,
  createMigraineEvent,
  updateMigraineEvent,
  addEnvironmentSnapshot,
  getUserSettings,
} from '@/lib/supabase';
import {
  MigraineEvent,
  EnvironmentSnapshot,
  PersonalFactors,
  Medication,
} from '@/types';
import { getHistoricalPointWeather, getHistoricalWeather } from '@/lib/weather';
import { getHistoricalAirQuality } from '@/lib/air-quality';

export default function JournalPage() {
  const [events, setEvents] = useState<MigraineEvent[]>([]);
  const [entryMode, setEntryMode] = useState<'now' | 'past'>('now');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{
    event: MigraineEvent;
    medications: Medication[];
    environment: EnvironmentSnapshot | null;
    personal: PersonalFactors | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [userLocationLat, setUserLocationLat] = useState(52.52);
  const [userLocationLon, setUserLocationLon] = useState(13.405);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const fetchedEvents = await getMigraineEvents();
        setEvents(fetchedEvents);
        const settings = await getUserSettings().catch(() => ({
          location_name: 'Berlin',
          location_lat: '52.52',
          location_lon: '13.405',
        }));
        setUserLocation(settings.location_name || null);
        setUserLocationLat(parseFloat(settings.location_lat || '52.52'));
        setUserLocationLon(parseFloat(settings.location_lon || '13.405'));
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
        const newEvent = await createMigraineEvent(data as any);
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

  const saveMedications = async (
    eventId: string,
    eventDate: string,
    medications: Array<{
      name: string;
      taken_at: string;
      dose_mg?: number;
      effectiveness?: number;
    }>
  ) => {
    for (const med of medications) {
      if (!med.name || !med.taken_at) continue;

      await fetch('/api/medication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          name: med.name,
          taken_at: convertTimeToISO(eventDate, med.taken_at),
          dose_mg: med.dose_mg,
          effectiveness: med.effectiveness,
        }),
      });
    }
  };

  const savePersonalFactors = async (
    eventId: string,
    data: RetrospectiveEntryData
  ) => {
    await fetch('/api/personal-factors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
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
  };

  const handleSaveRetrospective = async (data: RetrospectiveEntryData) => {
    try {
      setIsSaving(true);

      const newEvent = await createMigraineEvent({
        started_at: data.started_at,
        ended_at: data.ended_at,
        recovery_hours: data.recovery_hours,
        severity: data.severity,
        symptoms: data.symptoms,
        prodromal_symptoms: data.prodromal_symptoms,
        notes: data.notes || null,
        krii_value: null,
        stage: 'complete',
      });

      setSelectedEventId(newEvent.id);
      setEvents([newEvent, ...events]);

      const lat = data.location_lat || userLocationLat;
      const lon = data.location_lon || userLocationLon;
      const startedAtDate = new Date(data.started_at);

      const [historicalLag, historicalPoint, aqData] = await Promise.all([
        getHistoricalWeather(lat, lon, startedAtDate),
        getHistoricalPointWeather(lat, lon, startedAtDate),
        getHistoricalAirQuality(lat, lon, startedAtDate),
      ]);

      const pressureChange6h =
        historicalPoint.pressure !== null && historicalLag.pressure_6h_ago !== null
          ? historicalPoint.pressure - historicalLag.pressure_6h_ago
          : null;
      const pressureChange24h =
        historicalPoint.pressure !== null && historicalLag.pressure_24h_ago !== null
          ? historicalPoint.pressure - historicalLag.pressure_24h_ago
          : null;
      const tempChange6h =
        historicalPoint.temperature !== null && historicalLag.temp_6h_ago !== null
          ? historicalPoint.temperature - historicalLag.temp_6h_ago
          : null;

      const pressureTrend =
        pressureChange6h === null
          ? null
          : pressureChange6h < -1
            ? 'falling'
            : pressureChange6h > 1
              ? 'rising'
              : 'stable';

      const env: EnvironmentSnapshot = {
        id: '',
        event_id: newEvent.id,
        recorded_at: data.started_at,
        lat,
        lon,
        pressure: historicalPoint.pressure,
        pressure_trend: pressureTrend,
        pressure_change_6h: pressureChange6h,
        pressure_change_24h: pressureChange24h,
        pressure_6h_ago: historicalLag.pressure_6h_ago,
        pressure_12h_ago: historicalLag.pressure_12h_ago,
        pressure_24h_ago: historicalLag.pressure_24h_ago,
        pressure_48h_ago: historicalLag.pressure_48h_ago,
        temperature: historicalPoint.temperature,
        temperature_absolute: historicalPoint.temperature,
        temp_change_6h: tempChange6h,
        humidity: historicalPoint.humidity,
        wind_speed: historicalPoint.wind_speed,
        uv_index: null,
        air_quality_pm25: aqData.pm25,
        air_quality_no2: aqData.no2,
        air_quality_ozone: aqData.ozone,
        hour_of_day: startedAtDate.getHours(),
        season: getSeason(startedAtDate),
        created_at: new Date().toISOString(),
      };

      await addEnvironmentSnapshot(env);
      await saveMedications(newEvent.id, data.started_at, data.medications);
      await savePersonalFactors(newEvent.id, data);
    } catch (error) {
      console.error('Error saving retrospective event:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white/40 rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Lädt Journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">

      {/* Navigation */}
      <Navigation showLocationPin={true} locationName={userLocation} />
      {/* Main Content */}
      <div className="app-main max-w-6xl mx-auto dashboard-container py-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setEntryMode('now')}
            className={`ui-button ${entryMode === 'now' ? 'border-[var(--accent-low)]' : ''}`}
          >
            Jetzt aufzeichnen
          </button>
          <button
            onClick={() => {
              setSelectedEventId(null);
              setEntryMode('past');
            }}
            className={`ui-button ${entryMode === 'past' ? 'border-[var(--accent-medium)]' : ''}`}
          >
            Vergangene Attacke eintragen
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            {entryMode === 'now' ? (
              <JournalForm
                event={selectedEvent?.event || null}
                onSave={handleSaveForm}
                isLoading={isSaving}
              />
            ) : (
              <RetrospectiveJournalForm
                onSave={handleSaveRetrospective}
                isLoading={isSaving}
                defaultLocation={{
                  name: userLocation || 'Berlin',
                  lat: userLocationLat,
                  lon: userLocationLon,
                }}
              />
            )}
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
