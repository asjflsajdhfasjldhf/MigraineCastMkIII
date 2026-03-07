// SeverityChart Component - Bar chart of migraine severity distribution
'use client';

import React from 'react';

interface SeverityChartProps {
  data: { severity: number; count: number }[];
}

export const SeverityChart: React.FC<SeverityChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="w-full glass-card p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
        Schhweregrad-Verteilung
      </h2>

      {data.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
      ) : (
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.severity}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[var(--text-primary)]">
                  Schweregrad {item.severity}/10
                </span>
                <span className="text-sm text-[var(--text-secondary)] mono-value">{item.count}×</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-medium)] transition-all duration-300"
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
