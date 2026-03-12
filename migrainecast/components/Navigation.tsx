'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getUserSettings } from '@/lib/supabase';

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadLocation = async () => {
      try {
        const settings = await getUserSettings();
        if (!mounted) return;
        setLocationName(settings.location_name || null);
      } catch (error) {
        if (!mounted) return;
        console.error('Error loading location in navbar:', error);
      }
    };

    loadLocation();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkDatabase = async () => {
      try {
        const { error } = await supabase
          .from('migraine_events')
          .select('id')
          .limit(1);

        if (!mounted) return;
        setDbOnline(!error);
        if (error) {
          console.error('Database status check failed in navbar:', error);
        }
      } catch (error) {
        if (!mounted) return;
        console.error('Database status check exception in navbar:', error);
        setDbOnline(false);
      }
    };

    checkDatabase();
    const timer = window.setInterval(checkDatabase, 30000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const isActive = (href: string) => {
    return pathname === href;
  };

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/journal', label: 'Tagebuch' },
    { href: '/history', label: 'Verlauf' },
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

          <div className="nav-right-tools">
            <span className={`db-indicator ${dbOnline === false ? 'offline' : ''}`}>
              <span className="db-dot" />
              <span>{dbOnline === null ? 'DB prüft' : dbOnline ? 'DB online' : 'DB offline'}</span>
            </span>

            <Link href="/journal" className="nav-plus-btn" aria-label="Neuer Eintrag">
              +
            </Link>

            <button
              type="button"
              className="dots-menu-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Menü öffnen"
              aria-expanded={menuOpen}
            >
              ⋮
            </button>

            {menuOpen && (
              <div className="dots-dropdown" role="menu" aria-label="Hauptmenü">
                <div className="dots-dropdown-inner">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`dots-dropdown-link ${isActive(item.href) ? 'active' : ''}`}
                      onClick={handleLinkClick}
                    >
                      {item.label}
                    </Link>
                  ))}
                  {locationName && (
                    <Link href="/settings" className="location-pin nav-location-row" onClick={handleLinkClick}>
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
                      <span>{locationName}</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {menuOpen && (
        <>
          {/* Invisible backdrop to close menu on outside click */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'transparent' }}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        </>
      )}
    </>
  );
};
