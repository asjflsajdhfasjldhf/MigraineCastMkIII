'use client';

import React from 'react';
import Link from 'next/link';

interface LocationPinProps {
  location?: string | null;
}

export const LocationPin: React.FC<LocationPinProps> = ({ location }) => {
  if (!location) {
    return null;
  }

  return (
    <Link href="/settings" className="location-pin">
      <span>📍</span>
      <span>{location}</span>
    </Link>
  );
};
