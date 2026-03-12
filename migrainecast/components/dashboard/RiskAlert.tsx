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
        <span className="inline-flex mt-0.5" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L21 20H3L12 4Z" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 9V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="12" cy="16.5" r="1" fill="currentColor" />
          </svg>
        </span>
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
                    className="px-2 py-1 rounded-full text-xs border pill"
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
