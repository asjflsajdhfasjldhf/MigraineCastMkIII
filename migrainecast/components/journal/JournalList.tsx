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
      onset: 'border border-[var(--accent-medium)] text-[var(--accent-medium)]',
      active: 'border border-[var(--accent-high)] text-[var(--accent-high)]',
      recovery: 'border border-[var(--accent-neutral)] text-[var(--accent-neutral)]',
      complete: 'border border-[var(--accent-low)] text-[var(--accent-low)]',
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
        <div className="glass-card p-6 text-center">
          <p className="text-[var(--text-secondary)]">
            Noch keine Migräneereignisse erfasst.
          </p>
        </div>
      ) : (
        events.map((event) => (
          <div
            key={event.id}
            onClick={() => onSelectEvent(event.id)}
            className="glass-card p-4 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-[var(--text-secondary)]">
                  {formatDate(event.started_at)}
                </p>
                <p className="text-[var(--text-primary)] font-medium mt-1">
                  Schweregrad: <span className="text-lg mono-value">{event.severity}/10</span>
                </p>
              </div>
              {getStageBadge(event.stage)}
            </div>

            <div className="flex gap-4 text-sm">
              {getDurationHours(event.started_at, event.ended_at) && (
                <span className="text-[var(--text-secondary)]">
                  Dauer: {getDurationHours(event.started_at, event.ended_at)}h
                </span>
              )}
              {event.krii_value !== null && (
                <span className="text-[var(--text-secondary)]">
                  KRII: {Math.round(event.krii_value * 100)}%
                </span>
              )}
            </div>

            {event.notes && (
              <p className="text-sm text-[var(--text-secondary)] mt-2 line-clamp-2">
                {event.notes}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
};
