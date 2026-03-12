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
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 22C12 22 19 15.5455 19 10C19 6.13401 15.866 3 12 3C8.13401 3 5 6.13401 5 10C5 15.5455 12 22 12 22Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
      <span>{location}</span>
    </Link>
  );
};
