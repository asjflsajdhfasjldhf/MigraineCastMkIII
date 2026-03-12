// Settings Page
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserSettings, updateUserSetting } from '@/lib/supabase';
import { UserSettings } from '@/types';
import { KRII_CONFIG } from '@/lib/krii-config';
import { Navigation } from '@/components/Navigation';

interface GeocodeApiResult {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  location_lat: '52.52',
  location_lon: '13.405',
  location_name: 'Berlin',
  email_notifications: 'true',
  sleep_hours_default: '7.5',
  chronotype: 'normal',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationResults, setLocationResults] = useState<GeocodeApiResult[]>([]);
  const [userLocation, setUserLocation] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await getUserSettings();
        setSettings({ ...DEFAULT_SETTINGS, ...loadedSettings });
        setUserLocation(loadedSettings.location_name || null);
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettings(DEFAULT_SETTINGS);
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

  setUserLocation(locationName);
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
          <div className="w-16 h-16 border-4 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Laedt Einstellungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Navigation */}
      <Navigation showLocationPin={false} locationName={null} />

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
              <div className="flex gap-2">
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
                  className="ui-button px-4 py-2 disabled:opacity-50"
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
                step="0.5"
                value={settings.sleep_hours_default}
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
              <div className="pl-4 space-y-2">
                {Object.entries(KRII_CONFIG.weights.personal).map(([key, value]) => (
                  <p key={key}>
                    <span className="text-[var(--text-primary)]">{key.replace('_', ' ')}:</span>{' '}
                    {(value * 100).toFixed(0)}% - {factorDescriptions[key]}
                  </p>
                ))}
              </div>
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
