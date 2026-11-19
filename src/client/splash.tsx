import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { calculateDayNumber } from '../shared/tangle-engine';
import type { TangleInitResponse } from '../shared/tangle-types';

export const Splash = () => {
  const [data, setData] = useState<TangleInitResponse | null>(null);

  const fallbackDay = calculateDayNumber();

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch('/api/init');
        if (res.ok) {
          const json = (await res.json()) as TangleInitResponse;
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load Tangle info:', err);
      }
    }
    void loadInfo();
  }, []);

  const dayNumber = data?.dayNumber ?? fallbackDay;
  const paddedDay = dayNumber.toString().padStart(3, '0');
  const dateString =
    data?.dateString ??
    new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const totalSolved = data?.communityStats?.totalSolved ?? 3420;
  const streak = data?.userStats?.currentStreak ?? 0;
  const rankTitle = data?.userStats?.rankTitle ?? 'Wanderer';
  const todayDone = data?.userStats?.todayCompleted ?? false;
  const levelTitle = data?.level?.title ?? 'Daily Planar Knot';

  return (
    <div className="splash-container">
      <div className="splash-card">
        <span className="splash-badge">Daily Knot #{paddedDay} · {dateString}</span>
        <h1 className="splash-title">Tangle</h1>
        <p className="splash-subtitle">{levelTitle}</p>

        {/* Animated preview knot */}
        <div className="splash-preview-box">
          <svg viewBox="0 0 160 100" className="splash-preview-svg">
            {/* Amber tension crossing threads */}
            <line x1="28" y1="25" x2="132" y2="75" className="thread-line thread-tension" />
            <line x1="28" y1="75" x2="132" y2="25" className="thread-line thread-tension" />
            {/* Clear silver threads */}
            <line x1="28" y1="25" x2="80" y2="15" className="thread-line thread-clear" />
            <line x1="132" y1="25" x2="80" y2="15" className="thread-line thread-clear" />
            <line x1="28" y1="75" x2="80" y2="85" className="thread-line thread-clear" />
            <line x1="132" y1="75" x2="80" y2="85" className="thread-line thread-clear" />
            {/* Active crossing point */}
            <circle cx="80" cy="50" r="3.5" className="crossing-marker" />
            {/* Preview pins */}
            {[
              { x: 28, y: 25 },
              { x: 132, y: 25 },
              { x: 80, y: 15 },
              { x: 28, y: 75 },
              { x: 132, y: 75 },
              { x: 80, y: 85 },
            ].map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5.5" className="pin-bezel" />
                <circle cx={p.x} cy={p.y} r="4" fill="#c5d0dc" />
                <circle cx={p.x} cy={p.y} r="1.5" fill="#141920" />
              </g>
            ))}
          </svg>
        </div>

        <p className="splash-desc">
          Drag the pins to untangle the threads. Leave zero lines crossing.
        </p>

        <div className="splash-stats">
          <div>
            <span className="splash-stat-num">{totalSolved.toLocaleString()}</span>
            <span className="splash-stat-label">Untangled today</span>
          </div>
          {streak > 0 ? (
            <div>
              <span className="splash-stat-num">{streak} days</span>
              <span className="splash-stat-label">{rankTitle}</span>
            </div>
          ) : (
            <div>
              <span className="splash-stat-num">Planar</span>
              <span className="splash-stat-label">Topology</span>
            </div>
          )}
        </div>

        <button
          className="primary-btn"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          autoFocus
        >
          {todayDone ? 'Play again or practice' : "Untangle today's knot"}
        </button>

        <div style={{ marginTop: '16px', fontSize: '11px', color: '#637180' }}>
          r/{context.subredditName ?? 'windward_daily_dev'}
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
