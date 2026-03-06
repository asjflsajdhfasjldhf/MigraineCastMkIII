// DailyForecast Component - 5-day forecast
'use client';

import React from 'react';
import { DailyForecast as DailyForecastType } from '@/types';

interface DailyForecastProps {
  data: DailyForecastType[];
}

export const DailyForecast: React.FC<DailyForecastProps> = ({ data }) => {
  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-4">
        5-Tage-Vorschau
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-400">Keine Daten verfügbar</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {data.slice(0, 5).map((day, idx) => {
            const date = new Date(day.date);
            const dateStr = date.toLocaleDateString('de-DE', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            const riskColor =
              day.krii_level === 'high'
                ? 'from-red-600 to-red-700'
                : day.krii_level === 'medium'
                  ? 'from-yellow-600 to-yellow-700'
                  : 'from-green-600 to-green-700';

            return (
              <div
                key={idx}
                className={`bg-gradient-to-br ${riskColor} rounded-lg p-4 text-white`}
              >
                <p className="text-sm font-medium mb-3">{dateStr}</p>
                <div className="mb-3">
                  <p className="text-xs text-gray-200 mb-1">KRII-Peak</p>
                  <p className="text-2xl font-bold">
                    {Math.round(day.krii_peak * 100)}%
                  </p>
                </div>
                <div className="text-xs text-gray-200">
                  <p>↑ {day.temperature_max.toFixed(0)}°C</p>
                  <p>↓ {day.temperature_min.toFixed(0)}°C</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
