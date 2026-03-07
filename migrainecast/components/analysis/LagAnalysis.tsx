// LagAnalysis Component - Shows pressure lag analysis
'use client';

import React from 'react';

interface LagDataPoint {
  hourBefore: number; // How many hours before migraine started
  averagePressureChange: number; // hPa
  frequency: number; // How often this pattern occurred
}

interface LagAnalysisProps {
  data: LagDataPoint[];
}

export const LagAnalysis: React.FC<LagAnalysisProps> = ({ data }) => {
  const maxChange = Math.max(
    ...data.map((d) => Math.abs(d.averagePressureChange)),
    1
  );

  return (
    <div className="w-full glass-card p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
        Druckwechsel-Analyse (Lag-Features)
      </h2>

      {data.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
      ) : (
        <div className="space-y-4">
          {data
            .sort((a, b) => a.hourBefore - b.hourBefore)
            .map((item) => (
              <div key={item.hourBefore}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text-primary)]">
                    {item.hourBefore}h vor Migränebeginn
                  </span>
                  <span className="text-sm text-[var(--text-secondary)] mono-value">
                    {item.hourBefore > 0 ? '−' : '+'}
                    {Math.abs(item.averagePressureChange).toFixed(1)} hPa
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.averagePressureChange < 0
                        ? 'bg-[var(--accent-high)]'
                        : 'bg-[var(--accent-neutral)]'
                    }`}
                    style={{
                      width: `${(Math.abs(item.averagePressureChange) / maxChange) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}

      <p className="text-xs text-[var(--text-secondary)] mt-6">
        Die stärksten Druckabfälle kurz vor Migränebeginn deuten auf kritische
        Trigger hin.
      </p>
    </div>
  );
};
