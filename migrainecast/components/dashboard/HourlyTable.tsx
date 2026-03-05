// HourlyTable Component - 72-hour forecast table
'use client';

import React from 'react';
import { HourlyForecast } from '@/types';

interface HourlyTableProps {
  data: HourlyForecast[];
}

export const HourlyTable: React.FC<HourlyTableProps> = ({ data }) => {
  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700 overflow-x-auto">
      <h2 className="text-xl font-semibold text-white mb-4">
        72-Stunden-Vorschau
      </h2>

      {data.length === 0 ? (
        <p className="text-gray-400">Keine Daten verfügbar</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-600">
              <th className="text-left py-2 px-2 text-gray-300">Uhrzeit</th>
              <th className="text-right py-2 px-2 text-gray-300">KRII</th>
              <th className="text-right py-2 px-2 text-gray-300">Temp °C</th>
              <th className="text-right py-2 px-2 text-gray-300">Druck hPa</th>
              <th className="text-right py-2 px-2 text-gray-300">Feucht %</th>
              <th className="text-right py-2 px-2 text-gray-300">PM2.5</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 24).map((hour, idx) => {
              const time = new Date(hour.time);
              const timeStr = time.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const riskColor =
                hour.krii_level === 'high'
                  ? 'text-red-400'
                  : hour.krii_level === 'medium'
                    ? 'text-yellow-400'
                    : 'text-green-400';

              return (
                <tr
                  key={idx}
                  className="border-b border-slate-700 hover:bg-slate-700 transition-colors"
                >
                  <td className="py-2 px-2 text-gray-300">{timeStr}</td>
                  <td className={`py-2 px-2 text-right font-semibold ${riskColor}`}>
                    {Math.round(hour.krii_value * 100)}%
                  </td>
                  <td className="py-2 px-2 text-right text-gray-300">
                    {hour.temperature.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-300">
                    {hour.pressure.toFixed(0)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-300">
                    {hour.humidity}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-300">
                    {hour.pm25 !== null ? hour.pm25.toFixed(1) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};
