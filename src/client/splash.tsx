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
  const todayDone = data?.userStats?.todayCompleted ?? false;

  return (
    <div className="splash-container">
      <div className="splash-card">
        <span className="splash-badge">Daily Knot #{paddedDay} · {dateString}</span>
        <h1 className="splash-title">Tangle</h1>
        <p className="splash-desc">
          Drag the pins to untangle the threads. Leave zero lines crossing.
        </p>

        <div className="splash-stats">
          <div>
            <span className="splash-stat-num">{totalSolved.toLocaleString()}</span>
            <span className="splash-stat-label">Untangled today</span>
          </div>
          {streak > 0 && (
            <div>
              <span className="splash-stat-num">{streak} days</span>
              <span className="splash-stat-label">Your streak</span>
            </div>
          )}
        </div>

        <button
          className="primary-btn"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          autoFocus
        >
          {todayDone ? "Play again or practice" : "Untangle today's knot"}
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
