// MigraineIndicator Component - Displays current KRII value with animated progress bar
'use client';

import React from 'react';

interface MigraineIndicatorProps {
  kriiValue: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
}

export const MigraineIndicator: React.FC<MigraineIndicatorProps> = ({
  kriiValue,
  riskLevel,
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
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">KRII-Wert</h2>
        <div
          className="mono-value text-[72px] leading-[0.95] font-semibold"
          style={{
            color: getRiskColor(riskLevel),
            textShadow: `0 0 28px color-mix(in oklab, ${getRiskColor(riskLevel)} 40%, transparent)`,
          }}
        >
          {percentage}%
        </div>
      </div>

      <p className="text-sm mb-4" style={{ color: getRiskColor(riskLevel) }}>
        {getRiskText(riskLevel)}
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
          ['●', 'Drucktrend'],
          ['◐', 'Hydration'],
          ['◍', 'Stress'],
        ].map(([icon, label]) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-[var(--text-secondary)]"
          >
            <span>{icon}</span>
            <span>{label}</span>
          </span>
        ))}
      </div>

      {/* Interpretation text */}
      <p className="text-xs text-[var(--text-secondary)] mt-4">
        {percentage < 30 &&
          'Das Risiko ist derzeit niedrig. Genießen Sie den Tag!'}
        {percentage >= 30 && percentage < 60 &&
          'Erhöhter Riskolevel. Achten Sie auf Trigger und schonen Sie sich.'}
        {percentage >= 60 &&
          'Hohes Risiko erkannt. Halten Sie Ihre Medikamente bereit.'}
      </p>
    </div>
  );
};
