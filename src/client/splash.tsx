import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { calculateDayNumber } from '../shared/generator';
import type { DailyInfoResponse } from '../shared/types';

export const Splash = () => {
  const [data, setData] = useState<DailyInfoResponse | null>(null);

  const fallbackDay = calculateDayNumber();

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch('/api/init');
        if (res.ok) {
          const json = (await res.json()) as DailyInfoResponse;
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load daily info:', err);
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

  const communityBirds = data?.communityStats?.totalBirdsSaved ?? 1420;
  const survivalRate = data?.communityStats?.survivalRate ?? 89;
  const streak = data?.userStats?.currentStreak ?? 0;
  const todayDone = data?.userStats?.todayCompleted ?? false;

  return (
    <div className="windward-splash-container">
      {/* Subtle atmospheric ambient glow */}
      <div className="ambient-cloud ambient-cloud-1" />
      <div className="ambient-cloud ambient-cloud-2" />

      <div className="splash-content">
        {/* Top Header Badge */}
        <header className="splash-header">
          <div className="corridor-badge">
            <span className="pulsing-beacon" />
            <span>DAILY FLIGHT #{paddedDay} · {dateString.toUpperCase()}</span>
          </div>

          {streak > 0 && (
            <div className="streak-badge" title="Daily Migration Streak">
              <span>🔥</span>
              <span>{streak} DAY STREAK</span>
            </div>
          )}
        </header>

        {/* Title & Tagline */}
        <div className="splash-hero">
          <div className="hero-icon-wrapper">
            <span className="hero-bird">🕊️</span>
            <span className="wind-swirl">💨</span>
          </div>

          <h1 className="splash-title">WINDWARD</h1>
          <p className="splash-subtitle">A DAILY MIGRATION PUZZLE</p>
          <p className="splash-premise">
            You don't control the birds. You control the wind.
          </p>
        </div>

        {/* Quick How to Play Pills */}
        <div className="rules-preview">
          <div className="rule-pill">
            <span className="rule-icon">💨</span>
            <div className="rule-text">
              <strong>Set the Wind</strong>
              <small>N · S · E · W gusts</small>
            </div>
          </div>

          <div className="rule-pill">
            <span className="rule-icon">↗</span>
            <div className="rule-text">
              <strong>Ride Currents</strong>
              <small>Glides past obstacles</small>
            </div>
          </div>

          <div className="rule-pill">
            <span className="rule-icon">⌂</span>
            <div className="rule-text">
              <strong>Reach Nest</strong>
              <small>Protect the flock</small>
            </div>
          </div>
        </div>

        {/* Community Ledger Bar */}
        <div className="community-banner">
          <div className="community-stat">
            <span className="community-num">{communityBirds.toLocaleString()}</span>
            <span className="community-label">Birds Saved Today</span>
          </div>
          <div className="community-divider" />
          <div className="community-stat">
            <span className="community-num">{survivalRate}%</span>
            <span className="community-label">Survival Rate</span>
          </div>
        </div>

        {/* Start Button */}
        <div className="splash-cta-container">
          <button
            className="splash-play-btn"
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            autoFocus
          >
            <span>{todayDone ? 'PLAY AGAIN OR PRACTICE ↗' : "BEGIN TODAY'S FLIGHT ↗"}</span>
          </button>
        </div>

        {/* Footer info */}
        <footer className="splash-footer">
          <span>{context.username ? `Pilot: u/${context.username}` : 'Bite-sized daily puzzle'}</span>
          <span>·</span>
          <span>r/{context.subredditName ?? 'windward_daily'}</span>
        </footer>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
