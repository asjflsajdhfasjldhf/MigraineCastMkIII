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
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-6">
        Druckwechsel-Analyse (Lag-Features)
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-400">Keine Daten verfügbar</p>
      ) : (
        <div className="space-y-4">
          {data
            .sort((a, b) => a.hourBefore - b.hourBefore)
            .map((item) => (
              <div key={item.hourBefore}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300">
                    {item.hourBefore}h vor Migränebeginn
                  </span>
                  <span className="text-sm text-gray-400">
                    {item.hourBefore > 0 ? '−' : '+'}
                    {Math.abs(item.averagePressureChange).toFixed(1)} hPa
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      item.averagePressureChange < 0
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
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

      <p className="text-xs text-gray-400 mt-6">
        Die stärksten Druckabfälle kurz vor Migränebeginn deuten auf kritische
        Trigger hin.
      </p>
    </div>
  );
};
