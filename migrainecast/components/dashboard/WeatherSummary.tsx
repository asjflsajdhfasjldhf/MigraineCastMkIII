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
  return (
    <div className="w-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-semibold text-white mb-6">
        Aktuelle Wetterdaten
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Temperature */}
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-xs uppercase text-gray-400 mb-1">Temperatur</p>
          <p className="text-2xl font-bold text-white">{temperature.toFixed(1)}°C</p>
        </div>

        {/* Humidity */}
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-xs uppercase text-gray-400 mb-1">Luftfeuchtigkeit</p>
          <p className="text-2xl font-bold text-white">{humidity}%</p>
        </div>

        {/* Wind Speed */}
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-xs uppercase text-gray-400 mb-1">Wind</p>
          <p className="text-2xl font-bold text-white">{windSpeed.toFixed(1)} km/h</p>
        </div>

        {/* Pressure */}
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-xs uppercase text-gray-400 mb-1">Luftdruck</p>
          <p className="text-2xl font-bold text-white">{pressure.toFixed(0)} hPa</p>
        </div>

        {/* UV Index */}
        <div className="bg-slate-700 rounded-lg p-4">
          <p className="text-xs uppercase text-gray-400 mb-1">UV-Index</p>
          <p className="text-2xl font-bold text-white">{uvIndex.toFixed(1)}</p>
        </div>

        {/* PM2.5 */}
        {pm25 !== null && (
          <div className="bg-slate-700 rounded-lg p-4">
            <p className="text-xs uppercase text-gray-400 mb-1">PM2.5</p>
            <p className="text-2xl font-bold text-white">{pm25.toFixed(1)} µg/m³</p>
          </div>
        )}
      </div>
    </div>
  );
};
