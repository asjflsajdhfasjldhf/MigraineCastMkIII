// NeurodivergenceChart Component - Shows neurodiversity factor correlations
'use client';

import React from 'react';

interface NeurodivergenceData {
  factor: string;
  correlation: number; // 0-1
  averageScore: number; // 1-5
}

interface NeurodivergenceChartProps {
  data: NeurodivergenceData[];
}

export const NeurodivergenceChart: React.FC<NeurodivergenceChartProps> = ({
  data,
}) => {
  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-6">
        Neurodivergenz-Korrelation
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-400">Keine Daten verfügbar</p>
      ) : (
        <div className="space-y-6">
          {data.map((item) => (
            <div key={item.factor}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">
                  {item.factor}
                </span>
                <span className="text-sm text-gray-400">
                  {item.averageScore.toFixed(1)}/5 ø
                </span>
              </div>

              {/* Correlation bar */}
              <div className="mb-2">
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${item.correlation * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Korrelation mit Migräne: {(item.correlation * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-slate-700 rounded text-xs text-gray-300">
        <p className="font-medium mb-2">ℹ️ Hinweis:</p>
        <p>
          Diese Analyse zeigt, wie stark neurodivergenzbedingte Faktoren mit
          Ihren Migräneereignissen korrelieren. Das hilft bei der Planung und
          Prävention.
        </p>
      </div>
    </div>
  );
};
