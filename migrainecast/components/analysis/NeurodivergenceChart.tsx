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
    <div className="w-full glass-card p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
        Neurodivergenz-Korrelation
      </h2>

      {data.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
      ) : (
        <div className="space-y-6">
          {data.map((item) => (
            <div key={item.factor}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {item.factor}
                </span>
                <span className="text-sm text-[var(--text-secondary)] mono-value">
                  {item.averageScore.toFixed(1)}/5 ø
                </span>
              </div>

              {/* Correlation bar */}
              <div className="mb-2">
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-neutral)] transition-all duration-300"
                    style={{ width: `${item.correlation * 100}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Korrelation mit Migräne: {(item.correlation * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
