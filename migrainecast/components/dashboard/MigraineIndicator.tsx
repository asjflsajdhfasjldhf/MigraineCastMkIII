// MigraineIndicator Component - Displays current KRII value with animated progress bar
'use client';

import React from 'react';

interface MigraineIndicatorProps {
  kriiValue: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  title?: string;
}

export const MigraineIndicator: React.FC<MigraineIndicatorProps> = ({
  kriiValue,
  riskLevel,
  title = 'Heutiges Risiko',
}) => {
  const percentage = Math.round(kriiValue * 100);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'var(--accent-neutral)';
      case 'medium':
        return 'var(--accent-medium)';
      case 'high':
        return 'var(--accent-high)';
      default:
        return 'var(--accent-neutral)';
    }
  };

  const getRiskText = (level: string) => {
    switch (level) {
      case 'low':
        return 'Niedriges Risiko';
      case 'medium':
        return 'Mittleres Risiko';
      case 'high':
        return 'Hohes Risiko';
      default:
        return 'Unbekannt';
    }
  };

  return (
    <div className="w-full glass-card p-6">
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-xl font-medium text-[var(--text-primary)]">{title}</h2>
        <div
          className="text-[72px] leading-[0.95] font-light"
          style={{
            color: getRiskColor(riskLevel),
            textShadow: `0 0 28px color-mix(in oklab, ${getRiskColor(riskLevel)} 40%, transparent)`,
          }}
        >
          {percentage}%
        </div>
      </div>

      <p className="text-sm mb-4">
        <span className="text-[var(--text-secondary)]">Risikostufe:</span>{' '}
        <span style={{ color: getRiskColor(riskLevel) }}>{getRiskText(riskLevel)}</span>
      </p>

      {/* Progress bar */}
      <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden mb-5">
        <div
          className="h-full"
          style={{
            backgroundColor: getRiskColor(riskLevel),
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          ['Druck', 'Trendfaktor'],
          ['Hydration', 'Verhaltensfaktor'],
          ['Stress', 'Belastungsfaktor'],
        ].map(([icon, label]) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-[var(--text-secondary)] pill"
          >
            <span className="font-medium text-[var(--text-primary)]">{icon}</span>
            <span>{label}</span>
          </span>
        ))}
      </div>

    </div>
  );
};
