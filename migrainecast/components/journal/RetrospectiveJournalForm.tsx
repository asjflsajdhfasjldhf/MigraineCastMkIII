// RetrospectiveJournalForm - Single-page form for past migraine entries
'use client';

import React, { useState } from 'react';
import {
  MEDICATION_NAME_OPTIONS,
  PRODROMAL_SYMPTOM_OPTIONS,
  SYMPTOM_OPTIONS,
} from '@/lib/krii-config';

interface MedicationInput {
  name: string;
  taken_at: string;
  dose_mg?: number;
  effectiveness?: number;
}

export interface RetrospectiveEntryData {
  started_at: string;
  ended_at: string;
  severity: number;
  prodromal_symptoms: string[];
  symptoms: string[];
  medications: MedicationInput[];
  recovery_hours: number;
  sleep_hours: number;
  sleep_bedtime: string;
  sleep_waketime: string;
  meals_regular: boolean;
  hydration: number;
  alcohol_yesterday: boolean;
  caffeine_withdrawal: boolean;
  stress_level: number;
  sensory_overload: number;
  masking_intensity: number;
  social_exhaustion: number;
  overstimulation: number;
  notes: string;
  stage: 'complete';
}

interface RetrospectiveJournalFormProps {
  onSave: (data: RetrospectiveEntryData) => Promise<void>;
  isLoading?: boolean;
}

export const RetrospectiveJournalForm: React.FC<RetrospectiveJournalFormProps> = ({
  onSave,
  isLoading = false,
}) => {
  const [startedAt, setStartedAt] = useState(new Date());
  const [endedAt, setEndedAt] = useState(new Date());
  const [severity, setSeverity] = useState(5);
  const [prodromalSymptoms, setProdromalSymptoms] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [medications, setMedications] = useState<MedicationInput[]>([
    { name: '', taken_at: '', dose_mg: undefined, effectiveness: undefined },
  ]);
  const [recoveryHours, setRecoveryHours] = useState(24);
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
  const [notes, setNotes] = useState('');

  const handleToggleArrayValue = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
    active: boolean
  ) => {
    if (active) {
      setList([...list, value]);
    } else {
      setList(list.filter((item) => item !== value));
    }
  };

  const handleMedicationChange = (
    index: number,
    field: keyof MedicationInput,
    value: string | number | undefined
  ) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
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

  const handleSubmit = async () => {
    const payload: RetrospectiveEntryData = {
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      severity,
      prodromal_symptoms: prodromalSymptoms,
      symptoms,
      medications: medications.filter((m) => m.name && m.taken_at),
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

    await onSave(payload);
  };

  return (
    <div className="w-full glass-card p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
        Vergangene Attacke eintragen
      </h2>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              started_at
            </label>
            <input
              type="datetime-local"
              value={startedAt.toISOString().slice(0, 16)}
              onChange={(e) => setStartedAt(new Date(e.target.value))}
              className="ui-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              ended_at
            </label>
            <input
              type="datetime-local"
              value={endedAt.toISOString().slice(0, 16)}
              onChange={(e) => setEndedAt(new Date(e.target.value))}
              className="ui-input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Schweregrad: {severity}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={severity}
            onChange={(e) => setSeverity(parseInt(e.target.value, 10))}
            className="ui-range"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            Prodromale Symptome
          </label>
          <div className="space-y-2">
            {PRODROMAL_SYMPTOM_OPTIONS.map((symptom) => (
              <label key={symptom} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prodromalSymptoms.includes(symptom)}
                  onChange={(e) =>
                    handleToggleArrayValue(
                      prodromalSymptoms,
                      setProdromalSymptoms,
                      symptom,
                      e.target.checked
                    )
                  }
                  className="ui-checkbox"
                />
                <span className="text-[var(--text-primary)] capitalize">{symptom}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            Symptome waehrend Migräne
          </label>
          <div className="space-y-2">
            {SYMPTOM_OPTIONS.map((symptom) => (
              <label key={symptom} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={symptoms.includes(symptom)}
                  onChange={(e) =>
                    handleToggleArrayValue(
                      symptoms,
                      setSymptoms,
                      symptom,
                      e.target.checked
                    )
                  }
                  className="ui-checkbox"
                />
                <span className="text-[var(--text-primary)] capitalize">{symptom}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
            Medikamente
          </label>
          <div className="space-y-4">
            {medications.map((med, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Name
                    </label>
                    <select
                      value={med.name}
                      onChange={(e) => handleMedicationChange(idx, 'name', e.target.value)}
                      className="ui-select text-sm"
                    >
                      <option value="">Waehlen...</option>
                      {MEDICATION_NAME_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Uhrzeit
                    </label>
                    <input
                      type="time"
                      value={med.taken_at}
                      onChange={(e) => handleMedicationChange(idx, 'taken_at', e.target.value)}
                      className="ui-input text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                      Dosis (mg)
                    </label>
                    <input
                      type="number"
                      value={med.dose_mg || ''}
                      onChange={(e) =>
                        handleMedicationChange(
                          idx,
                          'dose_mg',
                          e.target.value ? parseInt(e.target.value, 10) : undefined
                        )
                      }
                      className="ui-input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
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
                          e.target.value ? parseInt(e.target.value, 10) : undefined
                        )
                      }
                      className="ui-input text-sm"
                    />
                  </div>
                </div>

                {medications.length > 1 && (
                  <button
                    onClick={() => handleRemoveMedication(idx)}
                    className="ui-button ui-button-danger text-sm"
                  >
                    Entfernen
                  </button>
                )}
              </div>
            ))}
            <button onClick={handleAddMedication} className="ui-button text-sm">
              + Medikament hinzufuegen
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Genesungszeit (Stunden)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={recoveryHours}
            onChange={(e) => setRecoveryHours(parseFloat(e.target.value))}
            className="ui-input"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Schlafstunden
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={sleepHours}
              onChange={(e) => setSleepHours(parseFloat(e.target.value))}
              className="ui-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Schlafbeginn
            </label>
            <input
              type="time"
              value={sleepBedtime}
              onChange={(e) => setSleepBedtime(e.target.value)}
              className="ui-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Aufwachzeit
            </label>
            <input
              type="time"
              value={sleepWaketime}
              onChange={(e) => setSleepWaketime(e.target.value)}
              className="ui-input"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={mealsRegular}
              onChange={(e) => setMealsRegular(e.target.checked)}
              className="ui-checkbox"
            />
            Mahlzeiten regelmaessig
          </label>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Hydration: {hydration}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={hydration}
              onChange={(e) => setHydration(parseInt(e.target.value, 10))}
              className="ui-range"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={alcoholYesterday}
              onChange={(e) => setAlcoholYesterday(e.target.checked)}
              className="ui-checkbox"
            />
            Alkohol gestern
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] cursor-pointer">
            <input
              type="checkbox"
              checked={caffeineWithdrawal}
              onChange={(e) => setCaffeineWithdrawal(e.target.checked)}
              className="ui-checkbox"
            />
            Koffeinentzug
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Stresspegel: {stressLevel}/5
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={stressLevel}
            onChange={(e) => setStressLevel(parseInt(e.target.value, 10))}
            className="ui-range"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Neurodivergenz-Faktoren</h3>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Sensorische Ueberlastung: {sensoryOverload}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={sensoryOverload}
              onChange={(e) => setSensoryOverload(parseInt(e.target.value, 10))}
              className="ui-range"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Masking-Intensitaet: {maskingIntensity}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={maskingIntensity}
              onChange={(e) => setMaskingIntensity(parseInt(e.target.value, 10))}
              className="ui-range"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Soziale Erschoepfung: {socialExhaustion}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={socialExhaustion}
              onChange={(e) => setSocialExhaustion(parseInt(e.target.value, 10))}
              className="ui-range"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Reizoffenheit: {overstimulation}/5
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={overstimulation}
              onChange={(e) => setOverstimulation(parseInt(e.target.value, 10))}
              className="ui-range"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Notizen
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="ui-textarea"
            placeholder="Zusaetzliche Informationen..."
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full ui-button disabled:opacity-50"
        >
          {isLoading ? 'Speichern...' : 'Vergangene Attacke speichern'}
        </button>
      </div>
    </div>
  );
};
