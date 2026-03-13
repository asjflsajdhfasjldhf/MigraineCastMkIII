// MigraineIndicator Component - Displays current KRII value with detailed risk info
'use client';

import React from 'react';
import { HourlyForecast, KRIIFactor } from '@/types';

interface MigraineIndicatorProps {
  kriiValue: number; // 0-1
  riskLevel: 'low' | 'medium' | 'high';
  hourlyData?: HourlyForecast[];
  kriiFactors?: KRIIFactor[];
  yesterdayPeak?: number;
}

export const MigraineIndicator: React.FC<MigraineIndicatorProps> = ({
  kriiValue,
  riskLevel,
  hourlyData = [],
  kriiFactors = [],
  yesterdayPeak,
}) => {
  const percentage = Math.round(kriiValue * 100);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'var(--accent-neutral)';
      case 'medium':
        return 'var(--accent-medium)';
      case 'high':
        return 'var(--accent-high)';
      default:
        return 'var(--accent-neutral)';
    }
  };

  const getRiskText = (level: string) => {
    switch (level) {
      case 'low':
        return 'Niedrig';
      case 'medium':
        return 'Mittel';
      case 'high':
        return 'Hoch';
      default:
        return 'Unbekannt';
    }
  };

  // Calculate peak today from hourly data
  const getPeakToday = () => {
    if (!hourlyData || hourlyData.length === 0) return null;
    
    const today = new Date();
    const todayDateStr = today.toISOString().split('T')[0];
    
    let maxKrii = 0;
    let peakTime = '';
    
    for (const hour of hourlyData) {
      const hourDateStr = hour.time.split('T')[0];
      if (hourDateStr === todayDateStr && hour.krii_value > maxKrii) {
        maxKrii = hour.krii_value;
        const date = new Date(hour.time);
        peakTime = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      }
    }
    
    return peakTime ? { percentage: Math.round(maxKrii * 100), time: peakTime } : null;
  };

  // Find strongest factor
  const getStrongestFactor = () => {
    if (!kriiFactors || kriiFactors.length === 0) return null;
    
    // Sort by weight * value to get the strongest contribution
    const sorted = [...kriiFactors].sort((a, b) => {
      const aContribution = a.weight * a.value;
      const bContribution = b.weight * b.value;
      return bContribution - aContribution;
    });
    
    const strongest = sorted[0];
    
    // Format the name nicely
    const nameMap: Record<string, string> = {
      pressure: 'Luftdruck',
      temperature: 'Temperatur',
      humidity: 'Luftfeuchte',
      wind: 'Wind',
      uv: 'UV-Index',
      air_quality: 'Luftqualität',
      sleep: 'Schlaf',
      stress: 'Stress',
      alcohol: 'Alkohol',
      caffeine: 'Koffein',
      meals: 'Mahlzeiten',
      hydration: 'Hydration',
      sensory_overload: 'Reizüberflutung',
      masking_intensity: 'Social Masking',
      social_exhaustion: 'Soziale Erschöpfung',
      overstimulation: 'Überreizung',
    };
    
    return {
      name: nameMap[strongest.name] || strongest.name,
      value: strongest.value,
      weight: strongest.weight,
    };
  };

  // Calculate comparison to yesterday
  const getYesterdayComparison = () => {
    if (yesterdayPeak === undefined || yesterdayPeak === null) return null;
    
    const yesterdayPercent = Math.round(yesterdayPeak * 100);
    const diff = percentage - yesterdayPercent;
    
    if (diff > 0) {
      return { direction: '↑', text: `Gestern ${yesterdayPercent}% ↑ höher` };
    } else if (diff < 0) {
      return { direction: '↓', text: `Gestern ${yesterdayPercent}% ↓ niedriger` };
    } else {
      return { direction: '→', text: `Gestern ${yesterdayPercent}% → gleich` };
    }
  };

  const peakToday = getPeakToday();
  const strongestFactor = getStrongestFactor();
  const yesterdayComparison = getYesterdayComparison();

  const todaySparkline = (() => {
    if (!hourlyData || hourlyData.length === 0) return null;

    const now = new Date();
    const isSameDay = (date: Date) =>
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const points = hourlyData
      .filter((hour) => {
        const date = new Date(hour.time);
        return isSameDay(date);
      })
      .map((hour) => {
        const date = new Date(hour.time);
        return {
          ts: date.getTime(),
          value: Math.max(0, Math.min(100, Math.round(hour.krii_value * 100))),
          hour: date.getHours(),
        };
      })
      .sort((a, b) => a.ts - b.ts);

    if (points.length === 0) return null;

    const width = 320;
    const height = 48;

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const dayStartTs = dayStart.getTime();
    const dayEndTs = dayEnd.getTime();
    const totalMs = Math.max(1, dayEndTs - dayStartTs);

    const toX = (ts: number) => ((ts - dayStartTs) / totalMs) * width;
    const toY = (value: number) => height - (value / 100) * height;

    const path = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(point.ts).toFixed(2)} ${toY(point.value).toFixed(2)}`)
      .join(' ');

    let currentPoint = points[0];
    for (const point of points) {
      if (point.ts <= now.getTime()) {
        currentPoint = point;
      } else {
        break;
      }
    }

    const peakPoint = points.reduce((peak, point) => (point.value > peak.value ? point : peak), points[0]);

    return {
      width,
      height,
      path,
      currentX: toX(currentPoint.ts),
      currentY: toY(currentPoint.value),
      peakValue: peakPoint.value,
      peakHourLabel: `${String(peakPoint.hour).padStart(2, '0')}h`,
    };
  })();

  return (
    <div className="w-full glass-card p-6">
      {/* Header: Title and Percentage */}
      <div className="flex items-start justify-between mb-4">
        <h2 className="text-[11px] leading-4 tracking-[0.05em] uppercase text-[var(--text-secondary)]">
          KRII
        </h2>
        <div
          className="text-[72px] leading-[0.95] font-light"
          style={{
            color: getRiskColor(riskLevel),
            textShadow: `0 0 28px color-mix(in oklab, ${getRiskColor(riskLevel)} 40%, transparent)`,
          }}
        >
          {percentage}%
        </div>
      </div>

      {/* Risk Level */}
      <p className="text-sm mb-4" style={{ color: getRiskColor(riskLevel) }}>
        {getRiskText(riskLevel)}
      </p>

      {/* Progress Bar (thin, 3px) */}
      <div className="w-full bg-white/10 rounded-full h-[3px] overflow-hidden mb-4">
        <div
          className="h-full"
          style={{
            backgroundColor: getRiskColor(riskLevel),
            width: `${percentage}%`,
          }}
        />
      </div>

      {todaySparkline && (
        <div className="mb-4">
          <div className="h-12 w-full relative">
            <svg viewBox={`0 0 ${todaySparkline.width} ${todaySparkline.height}`} className="w-full h-full" aria-label="KRII Tagesverlauf">
              <path
                d={todaySparkline.path}
                fill="none"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={todaySparkline.currentX}
                cy={todaySparkline.currentY}
                r="3"
                fill="white"
              />
            </svg>
            <p className="absolute top-0 right-0 text-[11px] text-[var(--text-secondary)]">
              Peak {todaySparkline.peakValue}% {todaySparkline.peakHourLabel}
            </p>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-white/10 mb-4" />

      {/* Peak Today */}
      {peakToday && (
        <p className="text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Peak heute: {peakToday.percentage}% um {peakToday.time}
        </p>
      )}

      {/* Strongest Factor */}
      {strongestFactor && (
        <p className="text-[12px] mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Stärkster Faktor: {strongestFactor.name} ({(strongestFactor.value * 100).toFixed(0)}%)
        </p>
      )}

      {/* Comparison Yesterday */}
      {yesterdayComparison && (
        <p className="text-[12px] mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {yesterdayComparison.text}
        </p>
      )}

      {/* Risk Factor Pills */}
      <div className="flex flex-wrap gap-2">
        {['Druck', 'Hydration', 'Stress'].map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-white/10 bg-white/5 text-[var(--text-secondary)] pill"
          >
            <span className="font-medium text-[var(--text-primary)]">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
