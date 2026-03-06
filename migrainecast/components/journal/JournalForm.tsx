// JournalForm Component - Three-stage form for migraine events
'use client';

import React, { useState } from 'react';
import { MigraineEvent } from '@/types';
import { SYMPTOM_OPTIONS, PRODROMAL_SYMPTOM_OPTIONS, MEDICATION_NAME_OPTIONS } from '@/lib/krii-config';

interface JournalFormProps {
  event?: MigraineEvent | null;
  onSave: (data: any) => Promise<void>;
  isLoading?: boolean;
}

interface Medication {
  name: string;
  taken_at: string;
  dose_mg?: number;
  effectiveness?: number;
}

export const JournalForm: React.FC<JournalFormProps> = ({
  event,
  onSave,
  isLoading = false,
}) => {
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(
    event?.stage === 'onset' ? 1 : event?.stage === 'active' ? 2 : 3
  );

  // Stage 1 - Onset
  const [startedAt, setStartedAt] = useState(
    event?.started_at ? new Date(event.started_at) : new Date()
  );
  const [severity, setSeverity] = useState(event?.severity || 5);
  const [prodromalSymptoms, setProdromalSymptoms] = useState(
    event?.prodromal_symptoms || []
  );

  // Stage 2 - Active
  const [endedAt, setEndedAt] = useState(
    event?.ended_at ? new Date(event.ended_at) : null
  );
  const [symptoms, setSymptoms] = useState(event?.symptoms || []);
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', taken_at: '', dose_mg: undefined, effectiveness: undefined },
  ]);

  // Stage 3 - Complete
  const [recoveryHours, setRecoveryHours] = useState(
    event?.recovery_hours || 24
  );
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepBedtime, setSleepBedtime] = useState('22:00');
  const [sleepWaketime, setSleepWaketime] = useState('07:00');
  const [mealsRegular, setMealsRegular] = useState(true);
  const [hydration, setHydration] = useState(3);
  const [alcoholYesterday, setAlcoholYesterday] = useState(false);
  const [caffeineWithdrawal, setCaffeineWithdrawal] = useState(false);
  const [stressLevel, setStressLevel] = useState(3);
  const [sensoryOverload, setSensoryOverload] = useState(3);
  const [maskingIntensity, setMaskingIntensity] = useState(3);
  const [socialExhaustion, setSocialExhaustion] = useState(3);
  const [overstimulation, setOverstimulation] = useState(3);
  const [notes, setNotes] = useState(event?.notes || '');

  const handleToggleSymptom = (symptom: string, isActive: boolean) => {
    if (isActive) {
      setSymptoms([...symptoms, symptom]);
    } else {
      setSymptoms(symptoms.filter((s) => s !== symptom));
    }
  };

  const handleToggleProdromalSymptom = (symptom: string, isActive: boolean) => {
    if (isActive) {
      setProdromalSymptoms([...prodromalSymptoms, symptom]);
    } else {
      setProdromalSymptoms(prodromalSymptoms.filter((s) => s !== symptom));
    }
  };

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: '', taken_at: '', dose_mg: undefined, effectiveness: undefined },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedicationChange = (
    index: number,
    field: keyof Medication,
    value: any
  ) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSaveStage = async () => {
    try {
      let data: any = {};

      if (currentStage === 1) {
        data = {
          started_at: startedAt.toISOString(),
          severity,
          prodromal_symptoms: prodromalSymptoms,
          stage: 'onset',
        };
      } else if (currentStage === 2) {
        data = {
          ended_at: endedAt?.toISOString() || null,
          symptoms,
          medications: medications.filter((m) => m.name), // Only save non-empty medications
          stage: 'active',
        };
      } else {
        data = {
          recovery_hours: recoveryHours,
          sleep_hours: sleepHours,
          sleep_bedtime: sleepBedtime,
          sleep_waketime: sleepWaketime,
          meals_regular: mealsRegular,
          hydration,
          alcohol_yesterday: alcoholYesterday,
          caffeine_withdrawal: caffeineWithdrawal,
          stress_level: stressLevel,
          sensory_overload: sensoryOverload,
          masking_intensity: maskingIntensity,
          social_exhaustion: socialExhaustion,
          overstimulation,
          notes,
          stage: 'complete',
        };
      }

      await onSave(data);

      if (currentStage < 3) {
        setCurrentStage((currentStage + 1) as any);
      }
    } catch (error) {
      console.error('Error saving stage:', error);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-6">
        Migräne-Tagebuch
      </h2>

      {/* Stage 1 - Onset */}
      {currentStage === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Startzeit
            </label>
            <input
              type="datetime-local"
              value={startedAt.toISOString().slice(0, 16)}
              onChange={(e) => setStartedAt(new Date(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Schweregrad: {severity}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={severity}
              onChange={(e) => setSeverity(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Prodromale Symptome
            </label>
            <div className="space-y-2">
              {PRODROMAL_SYMPTOM_OPTIONS.map((symptom) => (
                <label
                  key={symptom}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={prodromalSymptoms.includes(symptom)}
                    onChange={(e) =>
                      setProdromalSymptoms(
                        e.target.checked
                          ? [...prodromalSymptoms, symptom]
                          : prodromalSymptoms.filter((s) => s !== symptom)
                      )
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-gray-300 capitalize">{symptom}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stage 2 - Active */}
      {currentStage === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Endzeit
            </label>
            <input
              type="datetime-local"
              value={endedAt ? endedAt.toISOString().slice(0, 16) : ''}
              onChange={(e) => setEndedAt(new Date(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Symptome während Migräne
            </label>
            <div className="space-y-2">
              {SYMPTOM_OPTIONS.map((symptom) => (
                <label
                  key={symptom}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={symptoms.includes(symptom)}
                    onChange={(e) =>
                      handleToggleSymptom(symptom, e.target.checked)
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-gray-300 capitalize">{symptom}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Medications Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Medikamente
            </label>
            <div className="space-y-4">
              {medications.map((med, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-slate-700 rounded border border-slate-600 space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Name
                      </label>
                      <select
                        value={med.name}
                        onChange={(e) =>
                          handleMedicationChange(idx, 'name', e.target.value)
                        }
                        className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      >
                        <option value="">Wählen...</option>
                        {MEDICATION_NAME_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Uhrzeit
                      </label>
                      <input
                        type="time"
                        value={med.taken_at}
                        onChange={(e) =>
                          handleMedicationChange(idx, 'taken_at', e.target.value)
                        }
                        className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Dosis (mg)
                      </label>
                      <input
                        type="number"
                        value={med.dose_mg || ''}
                        onChange={(e) =>
                          handleMedicationChange(
                            idx,
                            'dose_mg',
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1">
                        Wirksamkeit (1-5)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={med.effectiveness || ''}
                        onChange={(e) =>
                          handleMedicationChange(
                            idx,
                            'effectiveness',
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        className="w-full px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                  {medications.length > 1 && (
                    <button
                      onClick={() => handleRemoveMedication(idx)}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={handleAddMedication}
                className="px-3 py-2 rounded bg-slate-600 text-gray-300 hover:bg-slate-500 text-sm transition"
              >
                + Medikament hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage 3 - Complete */}
      {currentStage === 3 && (
        <div className="space-y-6">
          {/* Recovery */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Genesungszeit (Stunden)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={recoveryHours}
              onChange={(e) => setRecoveryHours(parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
            />
          </div>

          {/* Sleep */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Schlafstunden
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Schlafbeginn
              </label>
              <input
                type="time"
                value={sleepBedtime}
                onChange={(e) => setSleepBedtime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Aufwachzeit
              </label>
              <input
                type="time"
                value={sleepWaketime}
                onChange={(e) => setSleepWaketime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              />
            </div>
          </div>

          {/* Meals & Hydration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mealsRegular}
                  onChange={(e) => setMealsRegular(e.target.checked)}
                  className="w-4 h-4"
                />
                Mahlzeiten regelmäßig
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Hydration: {hydration}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={hydration}
                onChange={(e) => setHydration(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Lifestyle */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={alcoholYesterday}
                onChange={(e) => setAlcoholYesterday(e.target.checked)}
                className="w-4 h-4"
              />
              Alkohol gestern
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={caffeineWithdrawal}
                onChange={(e) => setCaffeineWithdrawal(e.target.checked)}
                className="w-4 h-4"
              />
              Koffeinentzug
            </label>
          </div>

          {/* Stress */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Stresspegel: {stressLevel}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={stressLevel}
              onChange={(e) => setStressLevel(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Neurodiversity Block */}
          <div className="bg-slate-700 rounded p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-200">Neurodivergenz-Faktoren</h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Sensorische Überlastung: {sensoryOverload}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={sensoryOverload}
                onChange={(e) => setSensoryOverload(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Masking-Intensität: {maskingIntensity}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={maskingIntensity}
                onChange={(e) => setMaskingIntensity(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Soziale Erschöpfung: {socialExhaustion}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={socialExhaustion}
                onChange={(e) => setSocialExhaustion(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reizoffenheit: {overstimulation}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={overstimulation}
                onChange={(e) => setOverstimulation(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Notizen
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
              placeholder="Zusätzliche Informationen..."
            />
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 mt-6">
        {currentStage > 1 && (
          <button
            onClick={() => setCurrentStage((currentStage - 1) as any)}
            className="px-4 py-2 rounded bg-slate-700 text-white hover:bg-slate-600 transition"
          >
            Zurück
          </button>
        )}
        <button
          onClick={handleSaveStage}
          disabled={isLoading}
          className="flex-1 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 transition"
        >
          {isLoading ? 'Speichern...' : currentStage === 3 ? 'Abschließen' : 'Weiter'}
        </button>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 mt-6">
        {[1, 2, 3].map((stage) => (
          <div
            key={stage}
            className={`flex-1 h-1 rounded ${
              stage <= currentStage ? 'bg-blue-600' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
