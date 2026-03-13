'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
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

  useEffect(() => {
    const routeOrder = ['/', '/journal', '/history', '/analysis', '/settings'];
    const swipeThreshold = 50;
    let touchStartX: number | null = null;
    let touchStartY: number | null = null;

    const normalizePathname = (path: string): string => {
      const knownRoute = routeOrder.find((route) =>
        route === '/' ? path === '/' : path.startsWith(route)
      );
      return knownRoute || path;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (window.innerWidth >= 768) return;
      if (event.touches.length !== 1) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button')) return;

      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (window.innerWidth >= 768) return;
      if (touchStartX === null || touchStartY === null) return;
      if (event.changedTouches.length !== 1) return;

      const deltaX = event.changedTouches[0].clientX - touchStartX;
      const deltaY = event.changedTouches[0].clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;

      if (Math.abs(deltaX) < swipeThreshold) return;
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      const currentRoute = normalizePathname(pathname);
      const currentIndex = routeOrder.indexOf(currentRoute);
      if (currentIndex === -1) return;

      const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
      const nextRoute = routeOrder[nextIndex];
      if (!nextRoute) return;

      router.push(nextRoute);
      setMenuOpen(false);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pathname, router]);

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
