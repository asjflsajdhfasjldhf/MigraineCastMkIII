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
      }

      setIsSaving(false);
    } catch (error) {
      console.error('Error saving event:', error);
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Lädt Journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">🧠 MigraineCast</h1>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 rounded text-gray-400 hover:text-white transition"
            >
              Dashboard
            </Link>
            <Link
              href="/journal"
              className="px-4 py-2 rounded text-white hover:bg-slate-700 transition"
            >
              Tagebuch
            </Link>
            <Link
              href="/analysis"
              className="px-4 py-2 rounded text-gray-400 hover:text-white transition"
            >
              Analyse
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 rounded text-gray-400 hover:text-white transition"
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
            <h2 className="text-xl font-semibold text-white mb-4">
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
            <h2 className="text-2xl font-semibold text-white mb-6">
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
