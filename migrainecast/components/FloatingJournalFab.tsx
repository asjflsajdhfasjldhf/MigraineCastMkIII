'use client';

import Link from 'next/link';

export function FloatingJournalFab() {
  return (
    <Link
      href="/journal"
      className="fab-journal"
      aria-label="Neuen Tagebuch-Eintrag erstellen"
      title="Neuer Eintrag"
    >
      +
    </Link>
  );
}
