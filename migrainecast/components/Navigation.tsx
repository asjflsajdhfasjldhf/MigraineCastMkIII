'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationProps {
  showLocationPin: boolean;
  locationName?: string | null;
}

export const Navigation: React.FC<NavigationProps> = ({ showLocationPin, locationName }) => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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
    <nav className="app-nav">
      <div className="nav-container">
        {/* Logo */}
        <Link href="/" className="nav-logo" onClick={handleLinkClick}>
          MigraineCast
        </Link>

        {/* Desktop Navigation Links */}
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
        </div>

        {/* Right Side Container */}
        <div className="flex items-center gap-2">
          {/* Location Pin (Desktop/Mobile) */}
          {showLocationPin && locationName && (
            <Link href="/settings" className="location-pin hidden sm:flex">
              <span>📍</span>
              <span>{locationName}</span>
            </Link>
          )}

          {/* Hamburger Menu Button */}
          <button
            className={`hamburger-btn md:hidden ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        {/* Mobile Menu */}
        <div className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          {/* Mobile Location Pin */}
          {showLocationPin && locationName && (
            <Link href="/settings" className="location-pin flex md:hidden" onClick={handleLinkClick}>
              <span>📍</span>
              <span>{locationName}</span>
            </Link>
          )}

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-menu-link ${isActive(item.href) ? 'active' : ''}`}
              onClick={handleLinkClick}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};
