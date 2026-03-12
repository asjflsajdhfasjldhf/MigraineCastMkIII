// WeatherSummary Component
'use client';

import React from 'react';

interface WeatherSummaryProps {
  temperature: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  uvIndex: number;
  pm25: number | null;
}

export const WeatherSummary: React.FC<WeatherSummaryProps> = ({
  temperature,
  humidity,
  windSpeed,
  pressure,
  uvIndex,
  pm25,
}) => {
  const items = [
    { key: 'temp', label: 'TEMP', icon: '◌', value: `${temperature.toFixed(1)}°C`, critical: temperature >= 28 },
    { key: 'humidity', label: 'FEUCHTE', icon: '◍', value: `${humidity}%`, critical: humidity >= 80 },
    { key: 'wind', label: 'WIND', icon: '◔', value: `${windSpeed.toFixed(1)} km/h`, critical: windSpeed >= 40 },
    { key: 'pressure', label: 'DRUCK', icon: '◑', value: `${pressure.toFixed(0)} hPa`, critical: pressure <= 1007 },
    { key: 'uv', label: 'UV', icon: '◎', value: `${uvIndex.toFixed(1)}`, critical: uvIndex >= 7 },
    { key: 'pm25', label: 'PM2.5', icon: '◐', value: `${pm25 !== null ? pm25.toFixed(1) : '—'} µg/m³`, critical: pm25 !== null && pm25 >= 35 },
  ];

  return (
    <div className="w-full glass-card p-6">
      <h2 className="text-xl font-semibold text-white mb-6">
        Aktuelle Wetterdaten
      </h2>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="glass-card p-4"
            style={{ borderColor: item.critical ? 'var(--accent-high)' : undefined }}
          >
            <p className="text-3xl leading-none text-[var(--text-secondary)] mb-3">{item.icon}</p>
            <p className="text-[10px] uppercase tracking-[0.05em] whitespace-nowrap overflow-hidden text-[var(--text-secondary)] mb-1">{item.label}</p>
            <p className="mono-value text-lg font-semibold text-[var(--text-primary)]">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
