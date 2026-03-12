'use client';

import React, { useEffect, useState } from 'react';

interface AppGateProps {
  children: React.ReactNode;
}

const PIN = '1990';

export const AppGate: React.FC<AppGateProps> = ({ children }) => {
  const [entered, setEntered] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    // Per requirement, force PIN entry on each tab reload.
    sessionStorage.removeItem('migrainecast_pin_ok');
  }, []);

  const pushDigit = (digit: string) => {
    if (entered.length >= 4 || isFading) {
      return;
    }

    const next = `${entered}${digit}`;
    setEntered(next);

    if (next.length === 4) {
      if (next === PIN) {
        sessionStorage.setItem('migrainecast_pin_ok', '1');
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
            <h1 className="pin-title">MigraineCast</h1>
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
          </div>
        </div>
      )}
    </>
  );
};
