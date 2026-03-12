'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);

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
              <span>{dbOnline === null ? 'Data prueft' : dbOnline ? 'Data online' : 'Data offline'}</span>
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
