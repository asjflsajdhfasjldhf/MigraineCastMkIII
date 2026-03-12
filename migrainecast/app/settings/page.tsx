// Settings Page
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserSettings, supabase, updateUserSetting } from '@/lib/supabase';
import { UserSettings } from '@/types';
import { KRII_CONFIG } from '@/lib/krii-config';

interface GeocodeApiResult {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

interface BackfillProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
}

interface MigraineEventBackfillRow {
  id: string;
  started_at: string;
}

interface ArchiveHourlyResponse {
  hourly?: {
    time: string[];
    temperature_2m?: number[];
    relativehumidity_2m?: number[];
    surface_pressure?: number[];
    windspeed_10m?: number[];
    uv_index?: number[];
  };
}

const DEFAULT_SETTINGS: UserSettings = {
  location_lat: '52.52',
  location_lon: '13.405',
  location_name: 'Berlin',
  email_notifications: 'true',
  sleep_hours_default: '7.5',
  chronotype: 'normal',
};

const OPEN_METEO_ARCHIVE_URL = 'https://archive.open-meteo.com/v1/archive';
const OPEN_METEO_HISTORICAL_FORECAST_URL = 'https://historical-forecast-api.open-meteo.com/v1/forecast';
const OPEN_METEO_TIMEOUT_MS = 12000;

const formatDate = (dateIso: string): string => new Date(dateIso).toISOString().split('T')[0];

const parseHourlyTimestamp = (value: string): number => {
  const ms = Date.parse(value);
  if (Number.isFinite(ms)) return ms;
  return Date.parse(`${value}:00`);
};

const findClosestIndex = (times: string[], targetMs: number): number => {
  let closestIdx = 0;
  let minDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i++) {
    const currentMs = parseHourlyTimestamp(times[i]);
    const diff = Math.abs(currentMs - targetMs);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }

  return closestIdx;
};

const toNullableNumber = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toSeason = (month: number): 'spring' | 'summer' | 'autumn' | 'winter' => {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
};

const toPressureTrend = (change6h: number | null): 'falling' | 'stable' | 'rising' | null => {
  if (change6h === null) return null;
  if (change6h <= -1) return 'falling';
  if (change6h >= 1) return 'rising';
  return 'stable';
};

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPersonalFactors, setHasPersonalFactors] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationResults, setLocationResults] = useState<GeocodeApiResult[]>([]);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress | null>(null);
  const [backfillErrors, setBackfillErrors] = useState<string[]>([]);

  const handleNumericEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>('input, select, textarea, button')
    ).filter((element) => !element.hasAttribute('disabled'));

    const currentIndex = focusable.indexOf(event.currentTarget);
    const next = focusable[currentIndex + 1];
    if (next) next.focus();
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [loadedSettings, personalCountResult] = await Promise.all([
          getUserSettings(),
          supabase
            .from('personal_factors')
            .select('event_id', { count: 'exact', head: true }),
        ]);

        setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });
        setHasPersonalFactors((personalCountResult.count || 0) > 0);
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettings(DEFAULT_SETTINGS);
        setHasPersonalFactors(false);
        setMessage({
          type: 'error',
          text: 'Einstellungen konnten nicht geladen werden. Fallback: Berlin/Standardwerte.',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSettingChange = async (
    key: keyof UserSettings,
    value: string
  ) => {
    try {
      setSaving(true);
      await updateUserSetting(key, value);
      setSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
      setMessage({ type: 'success', text: 'Einstellung aktualisiert.' });
    } catch (error) {
      console.error('Error saving setting:', error);
      setMessage({ type: 'error', text: 'Fehler beim Speichern.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLocationSearch = async () => {
    if (!locationQuery.trim()) return;

    try {
      setLocationSearching(true);
      setMessage(null);

      const params = new URLSearchParams({
        name: locationQuery.trim(),
        count: '5',
        language: 'de',
        format: 'json',
      });

      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to search location');
      }

      const data = await response.json();
      const results: GeocodeApiResult[] = data.results || [];
      setLocationResults(results);

      if (results.length === 0) {
        setMessage({ type: 'error', text: 'Keine Orte gefunden. Bitte Suchbegriff anpassen.' });
      }
    } catch (error) {
      console.error('Error searching location:', error);
      setMessage({ type: 'error', text: 'Fehler bei der Stadtsuche.' });
    } finally {
      setLocationSearching(false);
    }
  };

  const handleLocationSelect = async (result: GeocodeApiResult) => {
    const locationName = `${result.name}${result.admin1 ? `, ${result.admin1}` : ''}${result.country ? ` (${result.country})` : ''}`;

    try {
      setSaving(true);

      await Promise.all([
        updateUserSetting('location_lat', result.latitude.toString()),
        updateUserSetting('location_lon', result.longitude.toString()),
        updateUserSetting('location_name', locationName),
      ]);

      setSettings((prev) => ({
        ...prev,
        location_lat: result.latitude.toString(),
        location_lon: result.longitude.toString(),
        location_name: locationName,
      }));

      setLocationResults([]);
      setLocationQuery(locationName);
      setMessage({ type: 'success', text: `Standort gespeichert: ${locationName}` });
    } catch (error) {
      console.error('Error saving location:', error);
      setMessage({ type: 'error', text: 'Standort konnte nicht gespeichert werden.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'test',
          email: 'jbrylla@icloud.com',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      setMessage({
        type: 'success',
        text: 'Test-E-Mail gesendet!',
      });
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Senden der Test-E-Mail.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBackfillWeather = async () => {
    try {
      setBackfillRunning(true);
      setMessage(null);
      setBackfillProgress({ total: 0, processed: 0, success: 0, failed: 0 });
      setBackfillErrors([]);

      const lat = Number.parseFloat(settings.location_lat || '52.52');
      const lon = Number.parseFloat(settings.location_lon || '13.405');
      const usedLat = Number.isFinite(lat) ? lat : 52.52;
      const usedLon = Number.isFinite(lon) ? lon : 13.405;

      const { data: events, error: eventsError } = await supabase
        .from('migraine_events')
        .select('id, started_at')
        .order('started_at', { ascending: true });

      if (eventsError) {
        throw new Error(`migraine_events konnten nicht geladen werden: ${eventsError.message}`);
      }

      const { data: existingSnapshots, error: snapshotsError } = await supabase
        .from('environment_snapshots')
        .select('event_id');

      if (snapshotsError) {
        throw new Error(`environment_snapshots konnten nicht geladen werden: ${snapshotsError.message}`);
      }

      const existingIds = new Set((existingSnapshots || []).map((row) => row.event_id));
      const missingEvents = ((events || []) as MigraineEventBackfillRow[]).filter(
        (event) => !existingIds.has(event.id)
      );

      const total = missingEvents.length;
      let processed = 0;
      let success = 0;
      let failed = 0;

      setBackfillProgress({ total, processed, success, failed });

      for (const event of missingEvents) {
        try {
          const dateStr = formatDate(event.started_at);
          const params = new URLSearchParams({
            latitude: usedLat.toString(),
            longitude: usedLon.toString(),
            start_date: dateStr,
            end_date: dateStr,
            hourly: 'temperature_2m,relativehumidity_2m,surface_pressure,windspeed_10m,uv_index,precipitation,weathercode',
            timezone: 'Europe/Berlin',
          });

          let response: Response | null = null;
          let archiveData: ArchiveHourlyResponse | null = null;
          let usedUrl = '';
          
          // Try archive.open-meteo.com first
          const archiveUrl = `${OPEN_METEO_ARCHIVE_URL}?${params.toString()}`;
          console.log('[Backfill] Versuche Archive URL:', archiveUrl);
          
          try {
            response = await fetchWithTimeout(archiveUrl, OPEN_METEO_TIMEOUT_MS);
            console.log('[Backfill] Archive response.status:', response.status);
            
            if (response.ok) {
              const raw = await response.text();
              archiveData = JSON.parse(raw) as ArchiveHourlyResponse;
              usedUrl = 'archive.open-meteo.com';
            }
          } catch (archiveError) {
            console.log('[Backfill] Archive URL fehlgeschlagen:', archiveError instanceof Error ? archiveError.message : String(archiveError));
          }

          // Falls archive fehlschlägt, versuche historical-forecast-api
          if (!archiveData) {
            const forecastUrl = `${OPEN_METEO_HISTORICAL_FORECAST_URL}?${params.toString()}`;
            console.log('[Backfill] Versuche Historical-Forecast URL:', forecastUrl);
            
            response = await fetchWithTimeout(forecastUrl, OPEN_METEO_TIMEOUT_MS);
            console.log('[Backfill] Historical-Forecast response.status:', response.status);
            
            if (!response.ok) {
              const body = await response.text();
              throw new Error(`Historical-Forecast status=${response.status}; body=${body.slice(0, 280)}`);
            }

            const raw = await response.text();
            try {
              archiveData = JSON.parse(raw) as ArchiveHourlyResponse;
              usedUrl = 'historical-forecast-api.open-meteo.com';
            } catch (error) {
              throw new Error(
                `Historical-Forecast JSON Parse Fehler: ${error instanceof Error ? error.message : 'Unbekannt'}; body=${raw.slice(0, 280)}`
              );
            }
          }

          if (!archiveData) {
            throw new Error('Keine Daten von Open-Meteo verfügbar');
          }

          if (!archiveData.hourly || archiveData.hourly.time.length === 0) {
            throw new Error('Open-Meteo lieferte keine hourly Daten');
          }

          const startedAt = new Date(event.started_at);
          const targetMs = startedAt.getTime();
          const idxNow = findClosestIndex(archiveData.hourly.time, targetMs);
          const idx6h = findClosestIndex(archiveData.hourly.time, targetMs - 6 * 60 * 60 * 1000);
          const idx12h = findClosestIndex(archiveData.hourly.time, targetMs - 12 * 60 * 60 * 1000);
          const idx24h = findClosestIndex(archiveData.hourly.time, targetMs - 24 * 60 * 60 * 1000);
          const idx48h = findClosestIndex(archiveData.hourly.time, targetMs - 48 * 60 * 60 * 1000);

          const pressureNow = toNullableNumber(archiveData.hourly.surface_pressure?.[idxNow]);
          const pressure6h = toNullableNumber(archiveData.hourly.surface_pressure?.[idx6h]);
          const pressure12h = toNullableNumber(archiveData.hourly.surface_pressure?.[idx12h]);
          const pressure24h = toNullableNumber(archiveData.hourly.surface_pressure?.[idx24h]);
          const pressure48h = toNullableNumber(archiveData.hourly.surface_pressure?.[idx48h]);
          const tempNow = toNullableNumber(archiveData.hourly.temperature_2m?.[idxNow]);
          const temp6h = toNullableNumber(archiveData.hourly.temperature_2m?.[idx6h]);

          const pressureChange6h =
            pressureNow !== null && pressure6h !== null ? pressureNow - pressure6h : null;
          const pressureChange24h =
            pressureNow !== null && pressure24h !== null ? pressureNow - pressure24h : null;
          const tempChange6h = tempNow !== null && temp6h !== null ? tempNow - temp6h : null;

          const payload = {
            event_id: event.id,
            recorded_at: event.started_at,
            lat: usedLat,
            lon: usedLon,
            pressure: pressureNow,
            pressure_trend: toPressureTrend(pressureChange6h),
            pressure_change_6h: pressureChange6h,
            pressure_change_24h: pressureChange24h,
            pressure_6h_ago: pressure6h,
            pressure_12h_ago: pressure12h,
            pressure_24h_ago: pressure24h,
            pressure_48h_ago: pressure48h,
            temperature: tempNow,
            temperature_absolute: tempNow,
            temp_change_6h: tempChange6h,
            humidity: toNullableNumber(archiveData.hourly.relativehumidity_2m?.[idxNow]),
            wind_speed: toNullableNumber(archiveData.hourly.windspeed_10m?.[idxNow]),
            uv_index: toNullableNumber(archiveData.hourly.uv_index?.[idxNow]),
            air_quality_pm25: null,
            air_quality_no2: null,
            air_quality_ozone: null,
            hour_of_day: startedAt.getHours(),
            season: toSeason(startedAt.getMonth()),
          };

          const { error: insertError } = await supabase
            .from('environment_snapshots')
            .insert(payload);

          if (insertError) {
            throw new Error(`Supabase Insert Fehler: ${insertError.message}`);
          }

          success += 1;
        } catch (error) {
          failed += 1;
          const reason = error instanceof Error ? error.message : 'Unbekannter Fehler';
          setBackfillErrors((prev) => [
            ...prev,
            `Event ${event.id}: event_id=${event.id} | started_at=${event.started_at} | lat=${usedLat} | lon=${usedLon} | reason=${reason}`,
          ]);
        } finally {
          processed += 1;
          setBackfillProgress({ total, processed, success, failed });
        }
      }

      setMessage({
        type: failed > 0 ? 'error' : 'success',
        text:
          failed > 0
            ? `Backfill abgeschlossen: ${success} von ${total} gespeichert, ${failed} Fehler. Details unten.`
            : `Backfill abgeschlossen: ${success} von ${total} gespeichert.`,
      });
    } catch (error) {
      console.error('Error running weather backfill:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Backfill fehlgeschlagen.',
      });
    } finally {
      setBackfillRunning(false);
    }
  };

  const factorDescriptions: Record<string, string> = {
    pressure: 'Luftdruckabfall und starke Druckschwankungen.',
    temperature: 'Starke Temperaturwechsel oder Hitze.',
    humidity: 'Hohe oder stark schwankende Luftfeuchte.',
    uv: 'Hohe UV-Belastung bei direkter Exposition.',
    wind: 'Starker Wind als zusaetzlicher Stressor.',
    air_quality: 'Feinstaub und Schadstoffe in der Luft.',
    sleep: 'Zu wenig oder unregelmaessiger Schlaf.',
    stress: 'Akuter psychischer oder koerperlicher Stress.',
    alcohol: 'Alkoholkonsum am Vortag.',
    caffeine: 'Koffeinentzug oder abrupte Reduktion.',
    meals: 'Unregelmaessige Mahlzeiten/Unterzuckerung.',
    hydration: 'Zu wenig Fluessigkeitszufuhr.',
    sensory_overload: 'Reizueberflutung durch Umgebung.',
    masking_intensity: 'Dauerhaftes soziales Masking.',
    social_exhaustion: 'Erschoepfung nach sozialer Belastung.',
    overstimulation: 'Anhaltend hohe neuronale Aktivierung.',
  };

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/10 border-t-white/40 rounded-full mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Laedt Einstellungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-main max-w-2xl mx-auto dashboard-container py-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl border ${
              message.type === 'success'
                ? 'bg-white/[0.04] border-[var(--accent-low)] text-[var(--text-primary)]'
                : 'bg-white/[0.04] border-[var(--accent-high)] text-[var(--text-primary)]'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Standort</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Standort suchen
              </label>
              <div className="flex gap-2 flex-nowrap">
                <input
                  type="text"
                  placeholder="Stadt oder Adresse eingeben..."
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLocationSearch();
                    }
                  }}
                  className="ui-input flex-1"
                />
                <button
                  onClick={handleLocationSearch}
                  disabled={locationSearching || saving}
                  className="ui-button flex-shrink-0 disabled:opacity-50"
                >
                  {locationSearching ? 'Sucht...' : 'Suchen'}
                </button>
              </div>

              {locationResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {locationResults.map((result) => {
                    const displayName = `${result.name}${result.admin1 ? `, ${result.admin1}` : ''}${result.country ? ` (${result.country})` : ''}`;
                    return (
                      <button
                        key={`${result.latitude}-${result.longitude}-${result.id || result.name}`}
                        onClick={() => handleLocationSelect(result)}
                        className="w-full text-left glass-card p-3 hover:border-[var(--border-hover)]"
                      >
                        <p className="text-[var(--text-primary)] font-medium">{displayName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-[var(--text-secondary)] mb-1">Aktuelle Stadt</p>
              <p className="text-white font-medium">{settings.location_name}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                ({settings.location_lat}, {settings.location_lon})
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Persoenliche Einstellungen</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Standard-Schlafstunden
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={settings.sleep_hours_default}
                onKeyDown={handleNumericEnter}
                onChange={(e) => {
                  handleSettingChange('sleep_hours_default', e.target.value);
                }}
                className="ui-input"
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Defaultwert fuer die persoenlichen Faktoren im Journal.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Chronotyp
              </label>
              <select
                value={settings.chronotype}
                onChange={(e) => {
                  handleSettingChange('chronotype', e.target.value);
                }}
                className="ui-select"
              >
                <option value="early">Fruehaufsteher</option>
                <option value="normal">Normal</option>
                <option value="late">Nachtmensch</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">E-Mail-Benachrichtigungen</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.email_notifications === 'true'}
                onChange={(e) => {
                  handleSettingChange('email_notifications', e.target.checked ? 'true' : 'false');
                }}
                className="ui-checkbox"
              />
              <span className="text-[var(--text-primary)]">Benachrichtigungen aktivieren</span>
            </label>

            <button
              onClick={handleSendTestEmail}
              disabled={saving}
              className="ui-button w-full disabled:opacity-50"
            >
              {saving ? 'Sende...' : 'Test-E-Mail senden'}
            </button>
          </div>
        </div>

        <div className="glass-card p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Datenpflege</h2>

          <div className="space-y-3">
            <button
              onClick={handleBackfillWeather}
              disabled={backfillRunning || saving}
              className="ui-button w-full disabled:opacity-50"
            >
              {backfillRunning ? 'Wetterdaten werden nachgeladen...' : 'Wetterdaten nachladen'}
            </button>

            {backfillProgress && (
              <div className="text-sm text-[var(--text-secondary)]">
                <p>
                  {backfillProgress.processed} von {backfillProgress.total} verarbeitet
                </p>
                <p>
                  Erfolgreich: {backfillProgress.success} | Fehler: {backfillProgress.failed}
                </p>
              </div>
            )}

            {backfillErrors.length > 0 && (
              <div className="text-sm rounded-xl border border-[var(--accent-high)] bg-white/[0.03] p-3 space-y-1">
                <p className="text-[var(--text-primary)] font-medium">Fehlerdetails</p>
                {backfillErrors.slice(-8).map((errorText, index) => (
                  <p key={`${errorText}-${index}`} className="text-[var(--text-secondary)] break-all">
                    {errorText}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">KRII-Algorithmus</h2>

          <div className="text-sm text-[var(--text-secondary)] space-y-4">
            <div>
              <p className="font-medium text-white mb-2">Wetter-Gewichtungen (Read-only)</p>
              <div className="pl-4 space-y-2">
                {Object.entries(KRII_CONFIG.weights.weather).map(([key, value]) => (
                  <p key={key}>
                    <span className="text-[var(--text-primary)]">{key.replace('_', ' ')}:</span>{' '}
                    {(value * 100).toFixed(0)}% - {factorDescriptions[key]}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <p className="font-medium text-white mb-2">Persoenliche Gewichtungen (Read-only)</p>
              {hasPersonalFactors ? (
                <div className="pl-4 space-y-2">
                  {Object.entries(KRII_CONFIG.weights.personal).map(([key, value]) => (
                    <p key={key}>
                      <span className="text-[var(--text-primary)]">{key.replace('_', ' ')}:</span>{' '}
                      {(value * 100).toFixed(0)}% - {factorDescriptions[key]}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="pl-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[var(--text-muted)]">
                    Noch keine persoenlichen Faktoren erfasst - Standard-Gewichtungen werden genutzt (erscheinen sobald erste Eintraege im Journal gemacht werden)
                  </p>
                </div>
              )}
            </div>

            <div>
              <p className="font-medium text-white mb-2">Schwellwerte (Read-only)</p>
              <div className="pl-4 space-y-2">
                <p>Kritischer Luftdruck: {KRII_CONFIG.thresholds.pressure_critical} hPa</p>
                <p>Niedriges Risiko: {'<'} {(KRII_CONFIG.thresholds.low * 100).toFixed(0)}%</p>
                <p>
                  Mittleres Risiko: {(KRII_CONFIG.thresholds.low * 100).toFixed(0)}%-
                  {(KRII_CONFIG.thresholds.medium * 100).toFixed(0)}%
                </p>
                <p>Hohes Risiko: {'>'} {(KRII_CONFIG.thresholds.medium * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
