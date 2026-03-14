// MigraineIndicator Component - Displays current KRII value with detailed risk info
'use client';

import React from 'react';
import { EnvironmentSnapshot, HourlyForecast, KRIIFactor } from '@/types';
import { calculateKRII } from '@/lib/krii';
import { PERSONAL_DEFAULTS } from '@/lib/krii-config';
import { roundPercentValue, toKriiPercent } from '@/lib/krii-display';

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
  const percentage = toKriiPercent(kriiValue);

  const getKriiBarColor = (valuePct: number) => {
    if (valuePct < 40) return 'rgba(255,255,255,0.4)';
    if (valuePct <= 60) return 'rgba(251,146,60,0.8)';
    return 'rgba(248,113,113,0.8)';
  };

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
    const isSameLocalDay = (date: Date) =>
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    let maxKrii = 0;
    let peakTime = '';

    for (const hour of hourlyData) {
      const date = new Date(hour.time);
      if (isSameLocalDay(date) && hour.krii_value > maxKrii) {
        maxKrii = hour.krii_value;
        const date = new Date(hour.time);
        peakTime = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      }
    }

    return peakTime ? { percentage: toKriiPercent(maxKrii), time: peakTime } : null;
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
    
    const yesterdayPercent = toKriiPercent(yesterdayPeak);
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

  const todayBars = (() => {
    if (!hourlyData || hourlyData.length === 0) return null;

    const now = new Date();
    const isSameDay = (date: Date) =>
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const sortedHours = [...hourlyData].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    const computedByTimestamp = new Map<number, number>();

    for (let i = 0; i < sortedHours.length; i++) {
      const hour = sortedHours[i];
      const hourDate = new Date(hour.time);

      const prev6 = i >= 6 ? sortedHours[i - 6] : null;
      const prev12 = i >= 12 ? sortedHours[i - 12] : null;
      const prev24 = i >= 24 ? sortedHours[i - 24] : null;

      const pressureNow = typeof hour.pressure === 'number' ? hour.pressure : null;
      const pressure6 = prev6 && typeof prev6.pressure === 'number' ? prev6.pressure : null;
      const pressure12 = prev12 && typeof prev12.pressure === 'number' ? prev12.pressure : null;
      const pressure24 = prev24 && typeof prev24.pressure === 'number' ? prev24.pressure : null;

      const pressureChange6h =
        pressureNow !== null && pressure6 !== null ? pressureNow - pressure6 : null;
      const pressureChange24h =
        pressureNow !== null && pressure24 !== null ? pressureNow - pressure24 : null;

      const tempNow = typeof hour.temperature === 'number' ? hour.temperature : null;
      const temp6 = prev6 && typeof prev6.temperature === 'number' ? prev6.temperature : null;
      const tempChange6h = tempNow !== null && temp6 !== null ? tempNow - temp6 : null;

      const pressureTrend: 'falling' | 'stable' | 'rising' | null =
        pressureChange6h === null
          ? null
          : pressureChange6h < -1
            ? 'falling'
            : pressureChange6h > 1
              ? 'rising'
              : 'stable';

      const season: EnvironmentSnapshot['season'] =
        hourDate.getMonth() >= 2 && hourDate.getMonth() <= 4
          ? 'spring'
          : hourDate.getMonth() >= 5 && hourDate.getMonth() <= 7
            ? 'summer'
            : hourDate.getMonth() >= 8 && hourDate.getMonth() <= 10
              ? 'autumn'
              : 'winter';

      const env: EnvironmentSnapshot = {
        id: '',
        event_id: '',
        recorded_at: hour.time,
        lat: 0,
        lon: 0,
        pressure: pressureNow,
        pressure_trend: pressureTrend,
        pressure_change_6h: pressureChange6h,
        pressure_change_24h: pressureChange24h,
        pressure_6h_ago: pressure6,
        pressure_12h_ago: pressure12,
        pressure_24h_ago: pressure24,
        pressure_48h_ago: null,
        temperature: tempNow,
        temperature_absolute: tempNow,
        temp_change_6h: tempChange6h,
        humidity: typeof hour.humidity === 'number' ? hour.humidity : null,
        wind_speed: typeof hour.wind_speed === 'number' ? hour.wind_speed : null,
        uv_index: hour.uv_index ?? null,
        air_quality_pm25: hour.pm25,
        air_quality_no2: hour.no2 ?? null,
        air_quality_ozone: hour.ozone ?? null,
        hour_of_day: hourDate.getHours(),
        season,
        created_at: new Date().toISOString(),
      };

      const krii = calculateKRII(env, null, PERSONAL_DEFAULTS.chronotype);
      computedByTimestamp.set(hourDate.getTime(), krii.value * 100);
    }

    const hourlyPoints = hourlyData
      .filter((hour) => {
        const date = new Date(hour.time);
        return isSameDay(date);
      })
      .map((hour) => {
        const date = new Date(hour.time);
        const computedValue = computedByTimestamp.get(date.getTime());
        return {
          ts: date.getTime(),
          value: Math.max(0, Math.min(100, computedValue ?? hour.krii_value * 100)),
          hour: date.getHours(),
        };
      })
      .sort((a, b) => a.ts - b.ts);

    const valuesByHour = new Map<number, number>();
    hourlyPoints.forEach((point) => {
      valuesByHour.set(point.hour, point.value);
    });

    const bars = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      value: valuesByHour.get(hour) ?? 0,
      isCurrent: hour === now.getHours(),
      hasData: valuesByHour.has(hour),
    }));

    const peakBar = bars.reduce((peak, bar) => (bar.value > peak.value ? bar : peak), bars[0]);

    return {
      bars,
      peakValue: roundPercentValue(peakBar.value),
      peakHourLabel: `${String(peakBar.hour).padStart(2, '0')}h`,
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

      {todayBars && (
        <div className="mb-4 -mx-6">
          <div className="h-16 w-full relative">
            <p className="absolute top-0 right-3 text-[11px] text-[var(--text-secondary)] z-10">
              Peak {todayBars.peakValue}% {todayBars.peakHourLabel}
            </p>
            <div className="flex h-full w-full items-end gap-px" aria-label="KRII Tagesverlauf">
              {todayBars.bars.map((bar) => (
                <div key={bar.hour} className="flex-1 h-full flex items-end">
                  <div
                    className="w-full rounded-t-[2px]"
                    style={{
                      height: bar.hasData ? `${Math.max(bar.value, 2)}%` : '0%',
                      backgroundColor: bar.isCurrent ? 'rgba(255,255,255,0.7)' : getKriiBarColor(bar.value),
                      border: bar.isCurrent ? '1px solid rgba(255,255,255,0.85)' : '1px solid transparent',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>
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
          Stärkster Faktor: {strongestFactor.name} ({toKriiPercent(strongestFactor.value)}%)
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
