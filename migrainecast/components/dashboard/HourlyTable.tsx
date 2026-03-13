// HourlyTable Component - 72-hour forecast table
'use client';

import React, { useState } from 'react';
import { HourlyForecast } from '@/types';

interface HourlyTableProps {
  data: HourlyForecast[];
}

export const HourlyTable: React.FC<HourlyTableProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatPressureDelta = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '→';
    return `${arrow} ${Math.abs(value).toFixed(1)}`;
  };

  return (
    <div className="w-full glass-card p-6">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between text-left"
        aria-expanded={isOpen}
      >
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">72-Stunden-Vorschau</h2>
        <span className="text-[var(--text-secondary)] text-lg leading-none">{isOpen ? '▾' : '▸'}</span>
      </button>

      {!isOpen ? (
        <p className="text-[var(--text-secondary)] mt-4">Ausgeklappt zeigt die Tabelle die nächsten 72 Stunden.</p>
      ) : data.length === 0 ? (
        <p className="text-[var(--text-secondary)]">Keine Daten verfügbar</p>
      ) : (
        <div className="mt-4">
          <div className="md:hidden space-y-3">
            {data.slice(0, 72).map((hour, idx) => {
              const time = new Date(hour.time);
              const timeStr = time.toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const hasAirQuality =
                hour.pm25 !== null ||
                (hour.no2 !== null && hour.no2 !== undefined) ||
                (hour.ozone !== null && hour.ozone !== undefined);

              const riskColor =
                hour.krii_level === 'high'
                  ? 'text-[var(--accent-high)]'
                  : hour.krii_level === 'medium'
                    ? 'text-[var(--accent-medium)]'
                    : 'text-[var(--accent-neutral)]';

              return (
                <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-[var(--text-secondary)]">{timeStr}</p>
                    <p className={`text-2xl font-semibold mono-value ${riskColor}`}>
                      {Math.round(hour.krii_value * 100)}%
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-[var(--text-secondary)]">
                    <p>Temp: {hour.temperature.toFixed(1)} °C</p>
                    <p>Druck: {hour.pressure.toFixed(0)} hPa</p>
                    <p>Wind: {hour.wind_speed.toFixed(1)} km/h</p>
                    <p>Δ6h: {formatPressureDelta(hour.pressure_change_6h)}</p>
                  </div>

                  {hasAirQuality && (
                    <div className="mt-2 text-xs text-[var(--text-secondary)] flex flex-wrap gap-x-3 gap-y-1">
                      {hour.pm25 !== null && <span>PM2.5: {hour.pm25.toFixed(1)}</span>}
                      {hour.no2 !== null && hour.no2 !== undefined && <span>NO2: {hour.no2.toFixed(1)}</span>}
                      {hour.ozone !== null && hour.ozone !== undefined && <span>Ozon: {hour.ozone.toFixed(1)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[1040px] text-[12px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-[6px] px-[8px] text-[var(--text-secondary)]">H</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">KRII</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">°C</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">hPa</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">Δ6h</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">%</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">km/h</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">UV</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">PM2.5</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">NO2</th>
                  <th className="text-right py-[6px] px-[8px] text-[var(--text-secondary)]">O₃</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 72).map((hour, idx) => {
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
                      <td className="py-[6px] px-[8px] text-[var(--text-primary)]">{timeStr}</td>
                      <td className={`py-[6px] px-[8px] text-right font-semibold mono-value ${riskColor}`}>
                        {Math.round(hour.krii_value * 100)}%
                      </td>
                      <td className="py-[6px] px-[8px] text-right text-[var(--text-secondary)]">
                        {hour.temperature.toFixed(1)}
                      </td>
                      <td className="py-[6px] px-[8px] text-right text-[var(--text-secondary)]">
                        {hour.pressure.toFixed(0)}
                      </td>
                      <td className="py-[6px] px-[8px] text-right text-[var(--text-secondary)]">
                        {formatPressureDelta(hour.pressure_change_6h)}
                      </td>
                      <td className="py-[6px] px-[8px] text-right text-[var(--text-secondary)]">
                        {hour.humidity}
                      </td>
                      <td className="py-[6px] px-[8px] text-right text-[var(--text-secondary)]">
                        {hour.wind_speed.toFixed(1)}
                      </td>
                      <td className="py-[6px] px-[8px] text-right text-[var(--text-secondary)]">
                        {hour.uv_index !== null && hour.uv_index !== undefined ? hour.uv_index.toFixed(1) : '—'}
                      </td>
                      <td className="py-[6px] px-[8px] text-right text-[var(--text-secondary)]">
                        {hour.pm25 !== null ? hour.pm25.toFixed(1) : '—'}
                      </td>
                      <td className="py-[6px] px-[8px] text-right text-[var(--text-secondary)]">
                        {hour.no2 !== null && hour.no2 !== undefined ? hour.no2.toFixed(1) : '—'}
                      </td>
                      <td className="py-[6px] px-[8px] text-right text-[var(--text-secondary)]">
                        {hour.ozone !== null && hour.ozone !== undefined ? hour.ozone.toFixed(1) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
