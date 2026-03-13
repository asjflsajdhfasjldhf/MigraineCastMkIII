'use client';

import React from 'react';
import { HourlyForecast } from '@/types';

interface RiskProfileChartProps {
  data: HourlyForecast[];
}

export const RiskProfileChart: React.FC<RiskProfileChartProps> = ({ data }) => {
  const points = data.slice(0, 72);

  if (points.length === 0) {
    return (
      <div className="w-full glass-card p-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">72h Risikoprofil</h2>
        <p className="text-[var(--text-secondary)]">Keine Daten verfuegbar</p>
      </div>
    );
  }

  const width = 720;
  const height = 160;
  const marginTop = 8;
  const marginRight = 10;
  const marginBottom = 24;
  const marginLeft = 30;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;
  const chartBottomY = marginTop + plotHeight;

  const toX = (idx: number) => {
    if (points.length <= 1) return marginLeft;
    return marginLeft + (idx / (points.length - 1)) * plotWidth;
  };

  const toY = (value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    return marginTop + (1 - clamped / 100) * plotHeight;
  };

  const path = points
    .map((hour, idx) => {
      const x = toX(idx);
      const y = toY((hour.krii_value || 0) * 100);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const firstTs = Date.parse(points[0].time);
  const lastTs = Date.parse(points[points.length - 1].time);
  const nowTs = Date.now();

  const nowX =
    Number.isFinite(firstTs) &&
    Number.isFinite(lastTs) &&
    lastTs > firstTs &&
    nowTs >= firstTs &&
    nowTs <= lastTs
      ? marginLeft + ((nowTs - firstTs) / (lastTs - firstTs)) * plotWidth
      : null;

  const xTicks = points
    .map((hour, idx) => ({ hour, idx }))
    .filter(({ hour }) => {
      const d = new Date(hour.time);
      return d.getMinutes() === 0 && d.getHours() % 6 === 0;
    });

  return (
    <div className="w-full glass-card p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">72h Risikoprofil</h2>

      <div className="w-full h-[120px] md:h-[160px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" role="img" aria-label="KRII-Verlauf der naechsten 72 Stunden">
          <defs>
            <clipPath id="risk-profile-clip">
              <rect x={marginLeft} y={marginTop} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>

          <rect x={marginLeft} y={toY(60)} width={plotWidth} height={toY(0) - toY(60)} fill="rgba(248,113,113,0.1)" />
          <rect x={marginLeft} y={toY(30)} width={plotWidth} height={toY(60) - toY(30)} fill="rgba(251,146,60,0.1)" />

          {[0, 30, 60, 100].map((value) => (
            <g key={value}>
              <line
                x1={marginLeft}
                y1={toY(value)}
                x2={width - marginRight}
                y2={toY(value)}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
              <text
                x={marginLeft - 6}
                y={toY(value) + 4}
                textAnchor="end"
                fontSize="10"
                fill="rgba(255,255,255,0.55)"
              >
                {value}
              </text>
            </g>
          ))}

          {xTicks.map(({ hour, idx }) => {
            const x = toX(idx);
            const d = new Date(hour.time);
            const label = d.getHours().toString().padStart(2, '0');
            return (
              <g key={`${hour.time}-${idx}`}>
                <line
                  x1={x}
                  y1={marginTop}
                  x2={x}
                  y2={chartBottomY}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="rgba(255,255,255,0.55)"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {nowX !== null && (
            <line
              x1={nowX}
              y1={marginTop}
              x2={nowX}
              y2={chartBottomY}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          <path
            d={path}
            clipPath="url(#risk-profile-clip)"
            fill="none"
            stroke="rgba(240,240,240,0.95)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
};
