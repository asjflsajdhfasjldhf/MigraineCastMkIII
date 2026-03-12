// HourlyTable Component - 72-hour forecast table
'use client';

import React from 'react';
import { HourlyForecast } from '@/types';

interface HourlyTableProps {
  data: HourlyForecast[];
}

export const HourlyTable: React.FC<HourlyTableProps> = ({ data }) => {
  return (
    <div className="w-full glass-card p-6 overflow-x-auto">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
        72-Stunden-Vorschau
      </h2>

      {data.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 px-2 text-[var(--text-secondary)]">Uhrzeit</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">KRII</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Temp °C</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Druck hPa</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">Feucht %</th>
              <th className="text-right py-2 px-2 text-[var(--text-secondary)]">PM2.5</th>
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
                  ? 'text-[var(--accent-high)]'
                  : hour.krii_level === 'medium'
                    ? 'text-[var(--accent-medium)]'
                    : 'text-[var(--accent-neutral)]';

              return (
                <tr
                  key={idx}
                  className="border-b border-white/8 hover:bg-white/5"
                  style={{
                    boxShadow:
                      hour.krii_value > 0.6
                        ? 'inset 2px 0 0 0 color-mix(in oklab, var(--accent-high) 70%, transparent)'
                        : undefined,
                  }}
                >
                  <td className="py-2 px-2 text-[var(--text-primary)]">{timeStr}</td>
                  <td className={`py-2 px-2 text-right font-semibold mono-value ${riskColor}`}>
                    {Math.round(hour.krii_value * 100)}%
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.temperature.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.pressure.toFixed(0)}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
                    {hour.humidity}
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-secondary)]">
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
