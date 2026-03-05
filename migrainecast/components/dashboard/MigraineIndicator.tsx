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
        return 'from-green-500 to-green-600';
      case 'medium':
        return 'from-yellow-500 to-yellow-600';
      case 'high':
        return 'from-red-500 to-red-600';
      default:
        return 'from-gray-500 to-gray-600';
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
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">KRII-Wert</h2>
        <span className="text-3xl font-bold text-white">{percentage}%</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden mb-4">
        <div
          className={`h-full bg-gradient-to-r ${getRiskColor(
            riskLevel
          )} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Risk level badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block w-3 h-3 rounded-full bg-gradient-to-r ${getRiskColor(
            riskLevel
          )}`}
        />
        <span className="text-sm font-medium text-gray-300">
          {getRiskText(riskLevel)}
        </span>
      </div>

      {/* Interpretation text */}
      <p className="text-xs text-gray-400 mt-4">
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
