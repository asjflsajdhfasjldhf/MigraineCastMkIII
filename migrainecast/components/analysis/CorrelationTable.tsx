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
    if (correlation > 0.5) return 'text-red-400';
    if (correlation > 0.25) return 'text-yellow-400';
    if (correlation > 0) return 'text-orange-400';
    if (correlation > -0.25) return 'text-gray-400';
    if (correlation > -0.5) return 'text-cyan-400';
    return 'text-blue-400';
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 overflow-x-auto">
      <h2 className="text-xl font-semibold text-white mb-4">
        Faktoren-Korrelation
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-400">Keine Daten verfügbar</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-600">
              <th className="text-left py-2 px-2 text-gray-300">Faktor</th>
              <th className="text-right py-2 px-2 text-gray-300">Korrelation</th>
              <th className="text-right py-2 px-2 text-gray-300">Häufigkeit</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-700 hover:bg-slate-700 transition-colors"
              >
                <td className="py-2 px-2 text-gray-300">{row.factor}</td>
                <td className={`py-2 px-2 text-right font-semibold ${getCorrelationColor(row.correlation)}`}>
                  {(row.correlation * 100).toFixed(0)}%
                </td>
                <td className="py-2 px-2 text-right text-gray-300">
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
