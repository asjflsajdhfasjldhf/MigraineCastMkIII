// JournalList Component - Lists all migraine events
'use client';

import React from 'react';
import { MigraineEvent } from '@/types';

interface JournalListProps {
  events: MigraineEvent[];
  onSelectEvent: (eventId: string) => void;
}

export const JournalList: React.FC<JournalListProps> = ({
  events,
  onSelectEvent,
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDurationHours = (startDate: string, endDate: string | null) => {
    if (!endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return hours.toFixed(1);
  };

  const getStageBadge = (stage: string) => {
    const badgeClasses: { [key: string]: string } = {
      onset: 'bg-yellow-900 text-yellow-200',
      active: 'bg-orange-900 text-orange-200',
      recovery: 'bg-blue-900 text-blue-200',
      complete: 'bg-green-900 text-green-200',
    };

    const labels: { [key: string]: string } = {
      onset: 'Beginn',
      active: 'Aktiv',
      recovery: 'Genesung',
      complete: 'Abgeschlossen',
    };

    return (
      <span className={`text-xs px-2 py-1 rounded ${badgeClasses[stage]}`}>
        {labels[stage]}
      </span>
    );
  };

  return (
    <div className="w-full space-y-3">
      {events.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-center">
          <p className="text-gray-400">
            Noch keine Migräneereignisse erfasst.
          </p>
        </div>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            onClick={() => onSelectEvent(event.id)}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 border border-slate-700 cursor-pointer hover:border-blue-500 transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-gray-400">
                  {formatDate(event.started_at)}
                </p>
                <p className="text-white font-medium mt-1">
                  Schweregrad: <span className="text-lg">{event.severity}/10</span>
                </p>
              </div>
              {getStageBadge(event.stage)}
            </div>

            <div className="flex gap-4 text-sm">
              {getDurationHours(event.started_at, event.ended_at) && (
                <span className="text-gray-400">
                  Dauer: {getDurationHours(event.started_at, event.ended_at)}h
                </span>
              )}
              {event.krii_value !== null && (
                <span className="text-gray-400">
                  KRII: {Math.round(event.krii_value * 100)}%
                </span>
              )}
            </div>

            {event.notes && (
              <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                {event.notes}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
};
