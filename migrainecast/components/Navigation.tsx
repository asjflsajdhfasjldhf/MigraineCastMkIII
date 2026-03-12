'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationProps {
  showLocationPin: boolean;
  locationName?: string | null;
}

export const Navigation: React.FC<NavigationProps> = ({ showLocationPin, locationName }) => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const isActive = (href: string) => {
    return pathname === href;
  };

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/journal', label: 'Tagebuch' },
    { href: '/analysis', label: 'Analyse' },
    { href: '/settings', label: 'Einstellungen' },
  ];

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="app-nav">
        <div className="nav-container">
          <Link href="/" className="nav-logo" onClick={handleLinkClick}>
            MigraineCast
          </Link>

          <div className="nav-links">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive(item.href) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
            {showLocationPin && locationName && (
              <Link href="/settings" className="location-pin">
                <span>📍</span>
                <span>{locationName}</span>
              </Link>
            )}
          </div>

          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Menue oeffnen"
            aria-expanded={menuOpen}
          >
            ☰
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="nav-overlay-menu" role="dialog" aria-modal="true">
          <button
            type="button"
            className="nav-overlay-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Menue schliessen"
          >
            ×
          </button>

          <div className="nav-overlay-links">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-overlay-link ${isActive(item.href) ? 'active' : ''}`}
                onClick={handleLinkClick}
              >
                {item.label}
              </Link>
            ))}
            {showLocationPin && locationName && (
              <Link href="/settings" className="location-pin nav-overlay-pin" onClick={handleLinkClick}>
                <span>📍</span>
                <span>{locationName}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
};
