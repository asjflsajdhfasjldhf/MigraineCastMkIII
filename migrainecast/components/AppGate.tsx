'use client';

import React, { useCallback, useEffect, useState } from 'react';

interface AppGateProps {
  children: React.ReactNode;
}

const PIN = '1990';
const PIN_STORAGE_KEY = 'migrainecast_pin_unlock';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const AppGate: React.FC<AppGateProps> = ({ children }) => {
  const [entered, setEntered] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [rememberFor30Days, setRememberFor30Days] = useState(true);

  const submitByKeyboard = useCallback(() => {
    if (entered.length !== 4 || isFading) return;

    if (entered === PIN) {
      try {
        if (rememberFor30Days) {
          localStorage.setItem(PIN_STORAGE_KEY, Date.now().toString());
        } else {
          localStorage.removeItem(PIN_STORAGE_KEY);
        }
      } catch (error) {
        console.error('Error writing PIN persistence to localStorage:', error);
      }

      setIsFading(true);
      window.setTimeout(() => {
        setIsUnlocked(true);
        setIsFading(false);
      }, 260);
      return;
    }

    setIsShaking(true);
    window.setTimeout(() => {
      setEntered('');
      setIsShaking(false);
    }, 360);
  }, [entered, isFading, rememberFor30Days]);

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(PIN_STORAGE_KEY);
      if (!storedValue) return;

      const timestamp = Number(storedValue);
      if (!Number.isFinite(timestamp)) {
        localStorage.removeItem(PIN_STORAGE_KEY);
        return;
      }

      const isValid = Date.now() - timestamp < THIRTY_DAYS_MS;
      if (isValid) {
        setIsUnlocked(true);
      } else {
        localStorage.removeItem(PIN_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error reading PIN persistence from localStorage:', error);
    }
  }, []);

  useEffect(() => {
    if (isUnlocked) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFading) return;

      if (event.key >= '0' && event.key <= '9') {
        event.preventDefault();
        pushDigit(event.key);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        deleteDigit();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        submitByKeyboard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUnlocked, isFading, entered, submitByKeyboard]);

  const pushDigit = (digit: string) => {
    if (entered.length >= 4 || isFading) {
      return;
    }

    const next = `${entered}${digit}`;
    setEntered(next);

    if (next.length === 4) {
      if (next === PIN) {
        try {
          if (rememberFor30Days) {
            localStorage.setItem(PIN_STORAGE_KEY, Date.now().toString());
          } else {
            localStorage.removeItem(PIN_STORAGE_KEY);
          }
        } catch (error) {
          console.error('Error writing PIN persistence to localStorage:', error);
        }

        setIsFading(true);
        window.setTimeout(() => {
          setIsUnlocked(true);
          setIsFading(false);
        }, 260);
      } else {
        setIsShaking(true);
        window.setTimeout(() => {
          setEntered('');
          setIsShaking(false);
        }, 360);
      }
    }
  };

  const deleteDigit = () => {
    if (isFading) {
      return;
    }
    setEntered((prev) => prev.slice(0, -1));
  };

  return (
    <>
      {children}
      {!isUnlocked && (
        <div className={`pin-overlay ${isFading ? 'fade-out' : ''}`}>
          <div className={`pin-card ${isShaking ? 'shake' : ''}`}>
            <p className="pin-eyebrow">SECURE ACCESS</p>
            <h1 className="pin-title">MigraineCast</h1>
            <p className="pin-subtitle">PIN eingeben · Tastatur: 0-9, Backspace</p>
            <div className="pin-dots" aria-label="PIN status">
              {[0, 1, 2, 3].map((idx) => (
                <span key={idx} className={`pin-dot ${idx < entered.length ? 'filled' : ''}`}>
                  ●
                </span>
              ))}
            </div>

            <div className="pin-pad" role="group" aria-label="PIN pad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="pin-btn"
                  onClick={() => pushDigit(digit)}
                >
                  {digit}
                </button>
              ))}
              <button type="button" className="pin-btn pin-btn-delete" onClick={deleteDigit}>
                Loeschen
              </button>
            </div>

            <label className="pin-remember-row">
              <input
                type="checkbox"
                className="ui-checkbox"
                checked={rememberFor30Days}
                onChange={(e) => setRememberFor30Days(e.target.checked)}
              />
              <span>30 Tage merken</span>
            </label>
          </div>
        </div>
      )}
    </>
  );
};
