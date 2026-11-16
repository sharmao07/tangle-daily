import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { calculateDayNumber } from '../shared/prism-levels';
import type { PrismInitResponse } from '../shared/prism-types';

export const Splash = () => {
  const [data, setData] = useState<PrismInitResponse | null>(null);

  const fallbackDay = calculateDayNumber();

  useEffect(() => {
    async function loadInfo() {
      try {
        const res = await fetch('/api/init');
        if (res.ok) {
          const json = (await res.json()) as PrismInitResponse;
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load PRISM daily info:', err);
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

  const communityCrystals = data?.communityStats?.totalCrystalsAwakened ?? 14820;
  const totalSolves = data?.communityStats?.totalSolves ?? 3840;
  const streak = data?.userStats?.currentStreak ?? 0;
  const todayDone = data?.userStats?.todayCompleted ?? false;

  return (
    <div className="prism-splash-container">
      {/* Laser glow streams in background */}
      <div className="laser-streak laser-red" />
      <div className="laser-streak laser-green" />
      <div className="laser-streak laser-blue" />

      <div className="splash-content">
        {/* Top Header Badge */}
        <header className="splash-header">
          <div className="corridor-badge">
            <span className="pulsing-beacon" />
            <span>CHAMBER #{paddedDay} · {dateString.toUpperCase()}</span>
          </div>

          {streak > 0 && (
            <div className="streak-badge" title="Daily Optician Streak">
              <span>🔥</span>
              <span>{streak} DAY STREAK</span>
            </div>
          )}
        </header>

        {/* Hero Title */}
        <div className="splash-hero">
          <div className="prism-hero-icon">
            <span className="crystal-core">💎</span>
            <div className="beam-ring" />
          </div>

          <h1 className="splash-title">PRISM</h1>
          <p className="splash-subtitle">A DAILY OPTICAL SYNTHESIS PUZZLE</p>
          <p className="splash-premise">
            Bend light. Synthesize color. Awaken the ancient crystals.
          </p>
        </div>

        {/* 3 Step Visual Pills */}
        <div className="rules-preview">
          <div className="rule-pill">
            <span className="rule-icon">🪞</span>
            <div className="rule-text">
              <strong>Aim the Mirrors</strong>
              <small>Reflect beams 90°</small>
            </div>
          </div>

          <div className="rule-pill">
            <span className="rule-icon">🟣</span>
            <div className="rule-text">
              <strong>Blend Colors</strong>
              <small>R + B = Violet</small>
            </div>
          </div>

          <div className="rule-pill">
            <span className="rule-icon">💎</span>
            <div className="rule-text">
              <strong>Awaken Crystals</strong>
              <small>Energize target gems</small>
            </div>
          </div>
        </div>

        {/* Community Ledger */}
        <div className="community-banner">
          <div className="community-stat">
            <span className="community-num">{communityCrystals.toLocaleString()}</span>
            <span className="community-label">Crystals Awakened Today</span>
          </div>
          <div className="community-divider" />
          <div className="community-stat">
            <span className="community-num">{totalSolves.toLocaleString()}</span>
            <span className="community-label">Chambers Solved</span>
          </div>
        </div>

        {/* Call to action button */}
        <div className="splash-cta-container">
          <button
            className="splash-play-btn"
            onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            autoFocus
          >
            <span>{todayDone ? 'REPLAY OR PRACTICE ↗' : 'ENTER OPTICAL CHAMBER ↗'}</span>
          </button>
        </div>

        {/* Footer */}
        <footer className="splash-footer">
          <span>{context.username ? `Optician: u/${context.username}` : 'Bite-sized daily puzzle'}</span>
          <span>·</span>
          <span>r/{context.subredditName ?? 'windward_daily_dev'}</span>
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
