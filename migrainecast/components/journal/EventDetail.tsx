// EventDetail Component - Shows all details for a single event
'use client';

import React from 'react';
import { MigraineEvent, Medication, EnvironmentSnapshot, PersonalFactors } from '@/types';

interface EventDetailProps {
  event: MigraineEvent;
  medications: Medication[];
  environment: EnvironmentSnapshot | null;
  personal: PersonalFactors | null;
}

export const EventDetail: React.FC<EventDetailProps> = ({
  event,
  medications,
  environment,
  personal,
}) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Event Summary */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          Ereignisübersicht
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Beginn</p>
            <p className="text-white">{formatDate(event.started_at)}</p>
          </div>

          {event.ended_at && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Ende</p>
              <p className="text-white">{formatDate(event.ended_at)}</p>
            </div>
          )}

          <div>
            <p className="text-xs uppercase text-gray-400 mb-1">Schweregrad</p>
            <p className="text-white">{event.severity}/10</p>
          </div>

          {event.recovery_hours !== null && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">
                Genesungszeit
              </p>
              <p className="text-white">{event.recovery_hours.toFixed(1)}h</p>
            </div>
          )}

          {event.krii_value !== null && (
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">KRII</p>
              <p className="text-white">{Math.round(event.krii_value * 100)}%</p>
            </div>
          )}
        </div>

        {event.notes && (
          <div className="mt-4 pt-4 border-t border-slate-600">
            <p className="text-xs uppercase text-gray-400 mb-2">Notizen</p>
            <p className="text-gray-300">{event.notes}</p>
          </div>
        )}
      </div>

      {/* Symptoms */}
      {(event.symptoms.length > 0 || event.prodromal_symptoms.length > 0) && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Symptome</h3>

          {event.prodromal_symptoms.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">Prodromal:</p>
              <div className="flex flex-wrap gap-2">
                {event.prodromal_symptoms.map((symptom) => (
                  <span
                    key={symptom}
                    className="bg-yellow-900 text-yellow-200 px-2 py-1 rounded text-sm"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
          )}

          {event.symptoms.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Während Migräne:</p>
              <div className="flex flex-wrap gap-2">
                {event.symptoms.map((symptom) => (
                  <span
                    key={symptom}
                    className="bg-red-900 text-red-200 px-2 py-1 rounded text-sm"
                  >
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Medications */}
      {medications.length > 0 && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Medikamente
          </h3>

          <div className="space-y-3">
            {medications.map((med) => (
              <div key={med.id} className="bg-slate-700 rounded p-3">
                <p className="text-white font-medium">{med.name}</p>
                <div className="text-xs text-gray-400 mt-1 space-y-1">
                  <p>Einnahmezeit: {formatDate(med.taken_at)}</p>
                  {med.dose_mg && <p>Dosis: {med.dose_mg}mg</p>}
                  {med.effectiveness && (
                    <p>Wirksamkeit: {med.effectiveness}/5</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment Data */}
      {environment && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Umweltdaten
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {environment.temperature !== null && (
              <div>
                <p className="text-gray-400">Temperatur</p>
                <p className="text-white">{environment.temperature.toFixed(1)}°C</p>
              </div>
            )}
            {environment.pressure !== null && (
              <div>
                <p className="text-gray-400">Luftdruck</p>
                <p className="text-white">{environment.pressure.toFixed(0)} hPa</p>
              </div>
            )}
            {environment.humidity !== null && (
              <div>
                <p className="text-gray-400">Luftfeuchtigkeit</p>
                <p className="text-white">{environment.humidity}%</p>
              </div>
            )}
            {environment.air_quality_pm25 !== null && (
              <div>
                <p className="text-gray-400">PM2.5</p>
                <p className="text-white">{environment.air_quality_pm25.toFixed(1)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personal Factors */}
      {personal && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Persönliche Faktoren
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {personal.sleep_hours !== null && (
              <div>
                <p className="text-gray-400">Schlaf</p>
                <p className="text-white">{personal.sleep_hours.toFixed(1)}h</p>
              </div>
            )}
            {personal.stress_level !== null && (
              <div>
                <p className="text-gray-400">Stress</p>
                <p className="text-white">{personal.stress_level}/5</p>
              </div>
            )}
            {personal.hydration !== null && (
              <div>
                <p className="text-gray-400">Flüssigkeitszufuhr</p>
                <p className="text-white">{personal.hydration}/5</p>
              </div>
            )}
            {personal.sensory_overload !== null && (
              <div>
                <p className="text-gray-400">Sensorische Überlastung</p>
                <p className="text-white">{personal.sensory_overload}/5</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
