// Settings Page
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getUserSettings, updateUserSetting } from '@/lib/supabase';
import { geocodeLocation } from '@/lib/weather';
import { UserSettings } from '@/types';
import { KRII_CONFIG } from '@/lib/krii-config';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [locationSearching, setLocationSearching] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getUserSettings();
        setSettings(settings);
        setLoading(false);
      } catch (error) {
        console.error('Error loading settings:', error);
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleLocationSearch = async (locationName: string) => {
    try {
      setLocationSearching(true);
      const result = await geocodeLocation(locationName);

      if (result) {
        setSettings((prev) =>
          prev
            ? {
                ...prev,
                location_lat: result.lat.toString(),
                location_lon: result.lon.toString(),
                location_name: result.name,
              }
            : null
        );

        await updateUserSetting('location_lat', result.lat.toString());
        await updateUserSetting('location_lon', result.lon.toString());
        await updateUserSetting('location_name', result.name);

        setMessage({
          type: 'success',
          text: `Standort aktualisiert: ${result.name}`,
        });
      } else {
        setMessage({
          type: 'error',
          text: 'Standort nicht gefunden.',
        });
      }

      setLocationSearching(false);
    } catch (error) {
      console.error('Error searching location:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Suchen des Standorts.',
      });
      setLocationSearching(false);
    }
  };

  const handleSettingChange = async (
    key: string,
    value: string
  ) => {
    try {
      setSaving(true);
      await updateUserSetting(key, value);
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              [key]: value,
            }
          : null
      );
      setMessage({ type: 'success', text: 'Einstellung aktualisiert.' });
      setSaving(false);
    } catch (error) {
      console.error('Error saving setting:', error);
      setMessage({ type: 'error', text: 'Fehler beim Speichern.' });
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
      setSaving(false);
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({
        type: 'error',
        text: 'Fehler beim Senden der Test-E-Mail.',
      });
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Lädt Einstellungen...</p>
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
              className="px-4 py-2 rounded text-gray-400 hover:text-white transition"
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
              className="px-4 py-2 rounded text-white hover:bg-slate-700 transition"
            >
              Einstellungen
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-900 border border-green-700 text-green-200'
                : 'bg-red-900 border border-red-700 text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Location Settings */}
        {settings && (
          <>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Standort
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Standort suchen
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Stadt oder Adresse eingeben..."
                      onKeyPress={(e) => {
                        if (
                          e.key === 'Enter' &&
                          (e.target as HTMLInputElement).value
                        ) {
                          handleLocationSearch(
                            (e.target as HTMLInputElement).value
                          );
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector(
                          'input[placeholder="Stadt oder Adresse eingeben..."]'
                        ) as HTMLInputElement;
                        if (input.value) {
                          handleLocationSearch(input.value);
                          input.value = '';
                        }
                      }}
                      disabled={locationSearching || saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 transition"
                    >
                      {locationSearching ? 'Sucht...' : 'Suchen'}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Aktueller Standort</p>
                  <p className="text-white font-medium">
                    {settings.location_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    ({settings.location_lat}, {settings.location_lon})
                  </p>
                </div>
              </div>
            </div>

            {/* Sleep Settings */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">Schlaf</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Standard-Schlafstunden
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.sleep_hours_default}
                    onChange={(e) => {
                      handleSettingChange(
                        'sleep_hours_default',
                        e.target.value
                      );
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Wird für die Abweichungsberechnung verwendet
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chronotyp
                  </label>
                  <select
                    value={settings.chronotype}
                    onChange={(e) => {
                      handleSettingChange('chronotype', e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="early">Frühaufsteher</option>
                    <option value="normal">Normal</option>
                    <option value="late">Nachtmensch</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Email Settings */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                E-Mail-Benachrichtigungen
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.email_notifications === 'true'}
                      onChange={(e) => {
                        handleSettingChange(
                          'email_notifications',
                          e.target.checked ? 'true' : 'false'
                        );
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-gray-300">
                      Tägliche Risiko-Warnungen aktivieren
                    </span>
                  </label>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-2">E-Mail-Adresse</p>
                  <p className="text-white font-monospace">jbrylla@icloud.com</p>
                </div>

                <button
                  onClick={handleSendTestEmail}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 transition"
                >
                  {saving ? 'Sende...' : 'Test-E-Mail senden'}
                </button>
              </div>
            </div>

            {/* KRII Configuration */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-4">
                KRII-Konfiguration
              </h2>

              <div className="text-sm text-gray-400 space-y-3">
                <div>
                  <p className="font-medium text-white mb-2">Gewichtungen</p>
                  <div className="pl-4 space-y-2">
                    <p>Wetter: {(KRII_CONFIG.weights.weather.pressure * 100).toFixed(0)}%</p>
                    <p>Persönlich: {(KRII_CONFIG.weights.personal.sleep * 100).toFixed(0)}%</p>
                  </div>
                </div>

                <div>
                  <p className="font-medium text-white mb-2">Schwellwerte</p>
                  <div className="pl-4 space-y-2">
                    <p>
                      Kritischer Luftdruck:{' '}
                      {KRII_CONFIG.thresholds.pressure_critical} hPa
                    </p>
                    <p>
                      Niedriges Risiko: {'<'}{' '}
                      {(KRII_CONFIG.thresholds.low * 100).toFixed(0)}%
                    </p>
                    <p>
                      Mittleres Risiko: {(KRII_CONFIG.thresholds.low * 100).toFixed(0)}%-
                      {(KRII_CONFIG.thresholds.medium * 100).toFixed(0)}%
                    </p>
                    <p>
                      Hohes Risiko: {'>'}{' '}
                      {(KRII_CONFIG.thresholds.medium * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 pt-2 border-t border-slate-600">
                  Diese Konfiguration wird während der App-Nutzung durch
                  ML-Ergebnisse optimiert.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
