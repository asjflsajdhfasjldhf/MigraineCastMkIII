// CorrelationTable Component - Shows factor correlations with migraine frequency
'use client';

import React from 'react';

interface CorrelationData {
  factor: string;
  correlation: number; // -1 to 1
  frequency: number; // percentage
}

interface CorrelationTableProps {
  data: CorrelationData[];
}

export const CorrelationTable: React.FC<CorrelationTableProps> = ({ data }) => {
  const getCorrelationColor = (correlation: number) => {
    if (correlation > 0.5) return 'text-[var(--accent-high)]';
    if (correlation > 0.25) return 'text-[var(--accent-medium)]';
    if (correlation > 0) return 'text-[var(--accent-medium)]';
    if (correlation > -0.25) return 'text-[var(--accent-neutral)]';
    if (correlation > -0.5) return 'text-[var(--text-secondary)]';
    return 'text-[var(--text-muted)]';
  };

  return (
    <div className="w-full glass-card p-6 overflow-x-auto">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
        Faktoren-Korrelation
      </h2>

      {data.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-2 text-[var(--text-secondary)]">Faktor</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Korrelation</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Häufigkeit</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-white/8 hover:bg-white/5"
              >
                <td className="py-2 px-2 text-[var(--text-primary)]">{row.factor}</td>
                <td className={`py-2 px-2 text-right font-semibold ${getCorrelationColor(row.correlation)}`}>
                  {(row.correlation * 100).toFixed(0)}%
                </td>
                <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                  {row.frequency.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
