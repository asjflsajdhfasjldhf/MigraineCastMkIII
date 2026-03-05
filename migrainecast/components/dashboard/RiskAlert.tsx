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
    <div className="w-full bg-gradient-to-r from-red-900 to-red-800 rounded-lg p-4 border border-red-700 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">Hohes Risiko erkannt</h3>
          <p className="text-sm text-red-100 mb-2">
            Höchstes Risiko heute um{' '}
            <span className="font-bold">{peakTime}</span> mit{' '}
            <span className="font-bold">{peakPercentage}%</span> KRII-Wert
          </p>

          {triggers.length > 0 && (
            <div className="text-sm text-red-100">
              <p className="font-medium mb-1">Hauptauslöser:</p>
              <div className="flex flex-wrap gap-1">
                {triggers.map((trigger, idx) => (
                  <span
                    key={idx}
                    className="bg-red-700 px-2 py-1 rounded text-xs"
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
