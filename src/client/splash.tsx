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
  const avatarUrl = data?.avatarUrl || data?.userStats?.avatarUrl;
  const weeklyHistory = data?.userStats?.weeklyHistory ?? [];

  return (
    <div className="splash-container">
      <div className="splash-card">
        {/* Header row with avatar & day badge */}
        <div className="splash-header-row">
          <div className="splash-user-badge">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Snoovatar" className="snoo-avatar-mini" />
            ) : (
              <div className="snoo-avatar-fallback">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <span className="splash-rank-tag">{rankTitle}</span>
          </div>
          <span className="splash-badge">Knot #{paddedDay}</span>
        </div>

        <h1 className="splash-title">Tangle</h1>
        <p className="splash-subtitle">{levelTitle} · {dateString}</p>

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

        {/* 7-Day Habit Streak Tracker */}
        {weeklyHistory.length > 0 && (
          <div className="weekly-habit-strip">
            {weeklyHistory.map((day) => (
              <div
                key={day.dayNumber}
                className={`habit-cell ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''}`}
                title={`Knot #${day.dayNumber} (${day.dayLabel})${day.completed ? ': Untangled' : ''}`}
              >
                <span className="habit-day">{day.dayLabel}</span>
                <div className="habit-dot">
                  {day.completed ? '✓' : day.isToday ? '•' : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="splash-desc">
          Drag pins until zero lines cross. A calm topological daily puzzle.
        </p>

        <div className="splash-stats">
          <div>
            <span className="splash-stat-num">{totalSolved.toLocaleString()}</span>
            <span className="splash-stat-label">Untangled today</span>
          </div>
          <div>
            <span className="splash-stat-num">{streak} {streak === 1 ? 'day' : 'days'}</span>
            <span className="splash-stat-label">Your streak</span>
          </div>
        </div>

        <button
          className="primary-btn"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
          autoFocus
        >
          {todayDone ? 'Practice or replay' : "Untangle today's knot"}
        </button>

        <div style={{ marginTop: '14px', fontSize: '11px', color: '#637180' }}>
          r/{context.subredditName ?? 'tangle_daily'}
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
