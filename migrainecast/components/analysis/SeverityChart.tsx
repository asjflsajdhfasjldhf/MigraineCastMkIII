// SeverityChart Component - Bar chart of migraine severity distribution
'use client';

import React from 'react';

interface SeverityChartProps {
  data: { severity: number; count: number }[];
}

export const SeverityChart: React.FC<SeverityChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-6">
        Schhweregrad-Verteilung
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-400">Keine Daten verfügbar</p>
      ) : (
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.severity}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-300">
                  Schweregrad {item.severity}/10
                </span>
                <span className="text-sm text-gray-400">{item.count}×</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-300"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
