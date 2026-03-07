// RiskAlert Component
'use client';

import React from 'react';

interface RiskAlertProps {
  show: boolean;
  peakPercentage: number;
  peakTime: string;
  triggers: string[];
}

export const RiskAlert: React.FC<RiskAlertProps> = ({
  show,
  peakPercentage,
  peakTime,
  triggers,
}) => {
  if (!show) return null;

  return (
    <div className="w-full glass-card rounded-2xl p-4 border mb-6" style={{ borderColor: 'var(--accent-high)' }}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">Hohes Risiko erkannt</h3>
          <p className="text-sm text-[var(--text-secondary)] mb-2">
            Höchstes Risiko heute um{' '}
            <span className="font-bold text-[var(--text-primary)] mono-value">{peakTime}</span> mit{' '}
            <span className="font-bold mono-value" style={{ color: 'var(--accent-high)' }}>{peakPercentage}%</span> KRII-Wert
          </p>

          {triggers.length > 0 && (
            <div className="text-sm text-[var(--text-secondary)]">
              <p className="font-medium mb-1">Hauptauslöser:</p>
              <div className="flex flex-wrap gap-1">
                {triggers.map((trigger, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-full text-xs border"
                    style={{ borderColor: 'var(--accent-high)', color: 'var(--accent-high)' }}
                  >
                    {trigger}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
