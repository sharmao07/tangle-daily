import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  calculateDayNumber,
  DIRECTIONS,
  generateDailyLevel,
  isInsideBoard,
  positionKey,
  type DailyInfoResponse,
  type Direction,
  type FlightLevel,
  type Position,
  type SubmitFlightRequest,
  type SubmitFlightResponse,
  type Tile,
} from '../shared/api';
import { sounds } from './audio';

type GameStatus = 'playing' | 'won' | 'lost';

type FlightSnapshot = {
  position: Position;
  birds: number;
  gustsLeft: number;
  checkpoints: number;
  collectedCheckpoints: string[];
  moves: number;
  message: string;
};

type GameState = FlightSnapshot & {
  status: GameStatus;
  undoStack: FlightSnapshot[];
  path: Position[];
};

const STARTING_BIRDS = 5;

function createInitialState(level: FlightLevel): GameState {
  const startPos = level.startPosition ?? { row: 6, col: 3 };
  return {
    position: startPos,
    birds: STARTING_BIRDS,
    gustsLeft: level.maxGusts,
    checkpoints: 0,
    collectedCheckpoints: [],
    moves: 0,
    status: 'playing',
    message: 'Set the wind to guide your flock toward the northern nest.',
    undoStack: [],
    path: [startPos],
  };
}

function getNextPosition(pos: Position, dir: Direction): Position {
  const delta = DIRECTIONS[dir];
  return {
    row: pos.row + delta.row,
    col: pos.col + delta.col,
  };
}

export function WindwardApp() {
  const todayDayNumber = useMemo(() => calculateDayNumber(), []);
  const [currentDay, setCurrentDay] = useState<number>(todayDayNumber);
  const [level, setLevel] = useState<FlightLevel>(() => generateDailyLevel(todayDayNumber));
  const [game, setGame] = useState<GameState>(() => createInitialState(level));

  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.isMuted());
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [communityBirds, setCommunityBirds] = useState<number>(1420);
  const [survivalRate, setSurvivalRate] = useState<number>(89);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalFlights, setTotalFlights] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  }, []);

  // Fetch initial game data and community stats from Devvit server
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/init');
        if (res.ok) {
          const data = (await res.json()) as DailyInfoResponse;
          if (data.level) {
            setLevel(data.level);
            setGame(createInitialState(data.level));
            setCurrentDay(data.dayNumber);
          }
          if (data.communityStats) {
            setCommunityBirds(data.communityStats.totalBirdsSaved);
            setSurvivalRate(data.communityStats.survivalRate);
          }
          if (data.userStats) {
            setCurrentStreak(data.userStats.currentStreak);
            setMaxStreak(data.userStats.maxStreak);
            setTotalFlights(data.userStats.totalFlights);
          }
        }
      } catch (err) {
        console.error('Error fetching game info:', err);
      }
    }
    void loadData();
  }, []);

  // Load another day from archive
  const selectDay = useCallback((day: number) => {
    const newLvl = generateDailyLevel(day);
    setCurrentDay(day);
    setLevel(newLvl);
    setGame(createInitialState(newLvl));
    setHasSubmitted(false);
    setShowArchiveModal(false);
  }, []);

  const getTileAt = useCallback(
    (pos: Position): Tile | undefined => {
      return level.board[pos.row]?.[pos.col];
    },
    [level]
  );

  // Submit result when game ends
  const submitResult = useCallback(
    async (finalGame: GameState) => {
      if (hasSubmitted) return;
      setHasSubmitted(true);

      const won = finalGame.status === 'won';
      const score =
        finalGame.birds * 200 +
        finalGame.checkpoints * 150 +
        finalGame.gustsLeft * 50 +
        (won ? 250 : 0);

      const payload: SubmitFlightRequest = {
        dayNumber: currentDay,
        won,
        birdsSaved: finalGame.birds,
        gustsLeft: finalGame.gustsLeft,
        checkpoints: finalGame.checkpoints,
        moves: finalGame.moves,
        score,
        path: finalGame.path,
      };

      try {
        const res = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const resp = (await res.json()) as SubmitFlightResponse;
          if (resp.newStreak !== undefined) {
            setCurrentStreak(resp.newStreak);
          }
          if (resp.communityBirdsSaved !== undefined) {
            setCommunityBirds(resp.communityBirdsSaved);
          }
        }
      } catch (err) {
        console.error('Error submitting score to server:', err);
      }
    },
    [currentDay, hasSubmitted]
  );

  // Advance game logic with wind currents and hazards
  const handleMove = useCallback(
    (direction: Direction) => {
      if (game.status !== 'playing') return;

      const previousSnapshot: FlightSnapshot = {
        position: game.position,
        birds: game.birds,
        gustsLeft: game.gustsLeft,
        checkpoints: game.checkpoints,
        collectedCheckpoints: [...game.collectedCheckpoints],
        moves: game.moves,
        message: game.message,
      };

      const gustsLeft = game.gustsLeft - 1;
      const moves = game.moves + 1;
      const targetPos = getNextPosition(game.position, direction);
      const targetTile = isInsideBoard(targetPos) ? getTileAt(targetPos) : undefined;

      // Mountain or boundaries block movement
      if (!targetTile || targetTile.kind === 'rock') {
        sounds.playGust();
        const blockedState: GameState = {
          ...game,
          gustsLeft,
          moves,
          message: 'A steep mountain ridge blocked that gust. Try another route.',
          undoStack: [...game.undoStack, previousSnapshot],
        };

        if (gustsLeft <= 0) {
          sounds.playDefeat();
          const lostState: GameState = {
            ...blockedState,
            status: 'lost',
            message: 'Your flock ran out of gusts before reaching sanctuary.',
          };
          setGame(lostState);
          void submitResult(lostState);
          return;
        }

        setGame(blockedState);
        return;
      }

      // Successful gust
      sounds.playGust();

      let currentPos = targetPos;
      let currentBirds = game.birds;
      let currentCheckpoints = game.checkpoints;
      const collectedKeys = [...game.collectedCheckpoints];
      let moveMessage = `The flock glides ${DIRECTIONS[direction].label.toLowerCase()}.`;
      let nextStatus: GameStatus = 'playing';

      // Landing on target tile
      if (targetTile.kind === 'storm') {
        currentBirds = Math.max(0, currentBirds - 1);
        sounds.playStorm();
        if (currentBirds === 0) {
          nextStatus = 'lost';
          moveMessage = 'The storm scattered the remainder of your flock!';
          sounds.playDefeat();
        } else {
          moveMessage = `Turbulence scattered 1 bird! ${currentBirds} birds remain.`;
        }
      } else if (targetTile.kind === 'checkpoint') {
        const key = positionKey(targetPos);
        if (!collectedKeys.includes(key)) {
          collectedKeys.push(key);
          currentCheckpoints += 1;
          sounds.playCheckpoint();
          moveMessage = `Waypoint rested! (+150 pts · ${currentCheckpoints}/2 collected)`;
        }
      } else if (targetTile.kind === 'nest') {
        nextStatus = 'won';
        moveMessage = 'Your flock has safely reached their sanctuary nest!';
        sounds.playVictory();
      }

      // Check for Jet Stream Wind Current push
      if (nextStatus === 'playing' && targetTile.kind === 'current' && targetTile.current) {
        sounds.playCurrent();
        const pushDir = targetTile.current;
        const pushedPos = getNextPosition(currentPos, pushDir);
        const pushedTile = isInsideBoard(pushedPos) ? getTileAt(pushedPos) : undefined;

        if (pushedTile && pushedTile.kind !== 'rock') {
          currentPos = pushedPos;
          moveMessage = `A high-altitude jet stream carried the flock ${DIRECTIONS[pushDir].label.toLowerCase()}!`;

          if (pushedTile.kind === 'storm') {
            currentBirds = Math.max(0, currentBirds - 1);
            sounds.playStorm();
            if (currentBirds === 0) {
              nextStatus = 'lost';
              moveMessage = 'Blown into a storm! The flock scattered.';
              sounds.playDefeat();
            }
          } else if (pushedTile.kind === 'checkpoint') {
            const key = positionKey(pushedPos);
            if (!collectedKeys.includes(key)) {
              collectedKeys.push(key);
              currentCheckpoints += 1;
              sounds.playCheckpoint();
              moveMessage = `Carried into a waypoint! (${currentCheckpoints}/2 collected)`;
            }
          } else if (pushedTile.kind === 'nest') {
            nextStatus = 'won';
            moveMessage = 'A tailwind carried the flock directly into their sanctuary nest!';
            sounds.playVictory();
          }
        }
      }

      // Check gusts exhaustion
      if (nextStatus === 'playing' && gustsLeft <= 0) {
        nextStatus = 'lost';
        moveMessage = 'Your flock ran out of gusts before reaching sanctuary.';
        sounds.playDefeat();
      }

      const nextState: GameState = {
        position: currentPos,
        birds: currentBirds,
        gustsLeft,
        checkpoints: currentCheckpoints,
        collectedCheckpoints: collectedKeys,
        moves,
        status: nextStatus,
        message: moveMessage,
        undoStack: [...game.undoStack, previousSnapshot],
        path: [...game.path, currentPos],
      };

      setGame(nextState);

      if (nextStatus !== 'playing') {
        void submitResult(nextState);
      }
    },
    [game, getTileAt, submitResult]
  );

  // Undo last move
  const handleUndo = useCallback(() => {
    if (game.undoStack.length === 0 || game.status !== 'playing') return;
    const previous = game.undoStack[game.undoStack.length - 1];
    if (!previous) return;

    setGame((curr) => ({
      ...curr,
      position: previous.position,
      birds: previous.birds,
      gustsLeft: previous.gustsLeft,
      checkpoints: previous.checkpoints,
      collectedCheckpoints: previous.collectedCheckpoints,
      moves: previous.moves,
      message: 'Turn undone. Select a new direction.',
      status: 'playing',
      undoStack: curr.undoStack.slice(0, -1),
      path: curr.path.slice(0, -1),
    }));
  }, [game.undoStack, game.status]);

  // Restart level
  const handleRestart = useCallback(() => {
    setGame(createInitialState(level));
    setHasSubmitted(false);
  }, [level]);

  // Keyboard navigation (WASD + Arrow keys)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showHelpModal || showArchiveModal || showStatsModal) {
        if (e.key === 'Escape') {
          setShowHelpModal(false);
          setShowArchiveModal(false);
          setShowStatsModal(false);
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') {
        e.preventDefault();
        handleMove('up');
      } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        handleMove('down');
      } else if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        handleMove('left');
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        handleMove('right');
      } else if (key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleUndo();
      } else if (key === 'r') {
        e.preventDefault();
        handleRestart();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleMove, handleUndo, handleRestart, showHelpModal, showArchiveModal, showStatsModal]);

  // Direct board tile click
  const handleTileClick = useCallback(
    (r: number, c: number) => {
      if (game.status !== 'playing') return;
      const dr = r - game.position.row;
      const dc = c - game.position.col;

      if (dr === -1 && dc === 0) handleMove('up');
      else if (dr === 1 && dc === 0) handleMove('down');
      else if (dr === 0 && dc === -1) handleMove('left');
      else if (dr === 0 && dc === 1) handleMove('right');
    },
    [game.position, game.status, handleMove]
  );

  // Score calculation
  const finalScore = useMemo(() => {
    const won = game.status === 'won';
    return (
      game.birds * 200 +
      game.checkpoints * 150 +
      game.gustsLeft * 50 +
      (won ? 250 : 0)
    );
  }, [game.birds, game.checkpoints, game.gustsLeft, game.status]);

  const starCount = useMemo(() => {
    if (game.status !== 'won') return 0;
    if (game.birds === 5 && game.checkpoints === 2) return 3;
    if (game.birds >= 4 || game.checkpoints >= 1) return 2;
    return 1;
  }, [game.status, game.birds, game.checkpoints]);

  // Copy shareable text formatted for Reddit comments
  const handleShare = useCallback(() => {
    const stars = starCount === 3 ? '⭐⭐⭐' : starCount === 2 ? '⭐⭐' : starCount === 1 ? '⭐' : '❌';
    const paddedDay = currentDay.toString().padStart(3, '0');
    const subreddit = context.subredditName ?? 'windward_daily';

    const shareText = [
      `🕊️ WINDWARD #${paddedDay} ${stars}`,
      `${game.status === 'won' ? `${game.birds}/5 flock saved` : 'Flock lost in storm'} · ${game.checkpoints}/2 waypoints`,
      `${game.gustsLeft} gusts left (${game.moves} moves) · Score: ${finalScore.toLocaleString()}`,
      '',
      game.status === 'won' ? '🟩 ↗ 🟩 ✧ 🟩 ⌂' : '🟩 ϟ 🟥 ── ✖',
      '',
      `Fly today on r/${subreddit}!`,
    ].join('\n');

    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        showToast('📋 Copied flight record! Paste into Reddit comments below.');
      })
      .catch(() => {
        showToast('Recorded flight! Copy your score to Reddit.');
      });
  }, [starCount, currentDay, game, finalScore, showToast]);

  const toggleSound = useCallback(() => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    showToast(muted ? '🔇 Sound muted' : '🔊 Sound enabled');
  }, [showToast]);

  return (
    <main className="windward-app">
      {/* Toast Notification */}
      {toastMessage && <div className="windward-toast">{toastMessage}</div>}

      {/* Top Bar Navigation */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">W</div>
          <div>
            <div className="brand-name">WINDWARD</div>
            <div className="brand-caption">A DAILY MIGRATION</div>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="icon-button"
            onClick={toggleSound}
            aria-label="Toggle sound"
            title="Toggle Sound"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button
            className="icon-button"
            onClick={() => setShowHelpModal(true)}
            aria-label="How to play"
            title="How to play"
          >
            ❓
          </button>

          <button
            className="icon-button"
            onClick={() => setShowStatsModal(true)}
            aria-label="Community stats and streaks"
            title="Records & Streaks"
          >
            🏆
          </button>

          <button
            className="icon-button"
            onClick={() => setShowArchiveModal(true)}
            aria-label="Past flights archive"
            title="Flight Archive"
          >
            📅
          </button>

          <div className="daily-badge">
            <span className="live-dot" />
            FLIGHT #{currentDay.toString().padStart(3, '0')}
          </div>
        </div>
      </header>

      {/* Intro & Region banner */}
      <section className="intro">
        <div className="eyebrow">{level.region.toUpperCase()} · PAR {level.parMoves}</div>
        <h1>
          Guide them <span>home.</span>
        </h1>
        <p>
          You don't control the birds. You control the wind. Navigate jet streams, avoid storm
          fronts, and bring your flock to safety.
        </p>
      </section>

      {/* Live HUD Stats */}
      <section className="stats" aria-label="Game statistics">
        <div className="stat-card">
          <span className="stat-label">YOUR FLOCK</span>
          <strong>
            {game.birds}
            <small> / {STARTING_BIRDS}</small>
          </strong>
          <span className="stat-icon">🕊️</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">GUSTS LEFT</span>
          <strong style={{ color: game.gustsLeft <= 2 ? '#ff9b82' : '#f1f1df' }}>
            {game.gustsLeft}
            <small> / {level.maxGusts}</small>
          </strong>
          <span className="stat-icon">↗</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">WAYPOINTS</span>
          <strong>
            {game.checkpoints}
            <small> / 2</small>
          </strong>
          <span className="stat-icon">✧</span>
        </div>
      </section>

      {/* Topography Map Board */}
      <section className="board-section">
        <div className="board-heading">
          <div>
            <span className="section-label">{level.title.toUpperCase()}</span>
            <span className="board-subtitle">Tap arrows or adjacent tiles to direct prevailing winds</span>
          </div>
          <span className="level-marker">7 × 7</span>
        </div>

        <div className="game-board" aria-label="7 by 7 migration corridor grid">
          {level.board.map((row, r) =>
            row.map((tile, c) => {
              const isPlayer = game.position.row === r && game.position.col === c;
              const isCollectedCheckpoint =
                tile.kind === 'checkpoint' && game.collectedCheckpoints.includes(positionKey({ row: r, col: c }));

              let symbol = '';
              if (isPlayer) {
                symbol = '🕊️';
              } else if (tile.kind === 'rock') {
                symbol = '◆';
              } else if (tile.kind === 'storm') {
                symbol = 'ϟ';
              } else if (tile.kind === 'current') {
                symbol = tile.current ? DIRECTIONS[tile.current].symbol : '↗';
              } else if (tile.kind === 'checkpoint') {
                symbol = isCollectedCheckpoint ? '✓' : '✧';
              } else if (tile.kind === 'nest') {
                symbol = '⌂';
              } else if (tile.kind === 'start') {
                symbol = '○';
              }

              const classes = [
                'tile',
                `tile-${tile.kind}`,
                isPlayer ? 'tile-player' : '',
                isPlayer && tile.kind === 'nest' ? 'tile-player-nest' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <div
                  key={`${r}-${c}`}
                  className={classes}
                  onClick={() => handleTileClick(r, c)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${tile.kind} at row ${r + 1}, column ${c + 1}`}
                >
                  <span className="tile-symbol">{symbol}</span>
                  {tile.kind === 'current' && !isPlayer && <span className="tile-caption">WIND</span>}
                </div>
              );
            })
          )}
        </div>

        {/* Legend */}
        <div className="legend">
          <span>
            <i className="legend-rock">◆</i> Mountain
          </span>
          <span>
            <i className="legend-storm">ϟ</i> Storm (-1 Bird)
          </span>
          <span>
            <i className="legend-wind">↗</i> Jet Stream (Glide)
          </span>
          <span>
            <i className="legend-check">✧</i> Waypoint
          </span>
          <span>
            <i style={{ color: '#a5c18d' }}>⌂</i> Sanctuary Nest
          </span>
        </div>
      </section>

      {/* Prevailing Wind Controls */}
      <section className="controls-section">
        <div className="controls-heading">
          <div>
            <span className="section-label">PREVAILING WIND</span>
            <span className="board-subtitle">Choose which direction to blow</span>
          </div>
          <span className="keyboard-hint">WASD / ARROWS</span>
        </div>

        <div className="direction-pad">
          <button
            className="direction-button direction-up"
            onClick={() => handleMove('up')}
            disabled={game.status !== 'playing'}
            aria-label="Send wind North"
            title="North Gust (↑ / W)"
          >
            ↑
          </button>
          <button
            className="direction-button direction-left"
            onClick={() => handleMove('left')}
            disabled={game.status !== 'playing'}
            aria-label="Send wind West"
            title="West Gust (← / A)"
          >
            ←
          </button>
          <button
            className="direction-button direction-down"
            onClick={() => handleMove('down')}
            disabled={game.status !== 'playing'}
            aria-label="Send wind South"
            title="South Gust (↓ / S)"
          >
            ↓
          </button>
          <button
            className="direction-button direction-right"
            onClick={() => handleMove('right')}
            disabled={game.status !== 'playing'}
            aria-label="Send wind East"
            title="East Gust (→ / D)"
          >
            →
          </button>
        </div>

        {/* Undo and Restart Bar */}
        <div className="action-row">
          <button
            className="secondary-action-btn"
            onClick={handleUndo}
            disabled={game.undoStack.length === 0 || game.status !== 'playing'}
            title="Undo last gust (Ctrl+Z)"
          >
            <span>↶</span>
            <span>Undo Gust ({game.undoStack.length})</span>
          </button>

          <button
            className="secondary-action-btn"
            onClick={handleRestart}
            title="Restart current flight (R)"
          >
            <span>↻</span>
            <span>Restart Flight</span>
          </button>
        </div>
      </section>

      {/* Flight Log Status Card */}
      <section className={`message-card message-${game.status}`} aria-live="polite">
        <div className="message-icon">
          {game.status === 'won' ? '✓' : game.status === 'lost' ? '!' : '✦'}
        </div>
        <div className="message-content">
          <strong>
            {game.status === 'won'
              ? 'Migration Successful!'
              : game.status === 'lost'
                ? 'Flight Ended in Turbulence'
                : 'Flight Status'}
          </strong>
          <span>{game.message}</span>
        </div>
      </section>

      {/* Victory / Defeat Result Card */}
      {game.status === 'won' && (
        <section className="result-card">
          <div className="result-eyebrow">
            {starCount === 3 ? 'FLAWLESS FLIGHT ⭐⭐⭐' : starCount === 2 ? 'GREAT FLIGHT ⭐⭐' : 'MIGRATION COMPLETE ⭐'}
          </div>

          <div className="result-score">{finalScore.toLocaleString()}</div>
          <div className="result-caption">TOTAL FLIGHT SCORE</div>

          <p>
            {game.birds} of {STARTING_BIRDS} birds brought safely home · {game.checkpoints}/2 waypoints rested ·{' '}
            {game.gustsLeft} gusts remaining in budget.
          </p>

          <button className="share-btn" onClick={handleShare}>
            <span>📋</span>
            <span>SHARE RECORD TO REDDIT COMMENTS</span>
          </button>

          <button className="restart-button full-restart" onClick={handleRestart}>
            FLY ROUTE AGAIN ↻
          </button>
        </section>
      )}

      {game.status === 'lost' && (
        <section className="result-card" style={{ borderColor: '#875b4c' }}>
          <div className="result-eyebrow" style={{ color: '#ffbca3' }}>
            CORRIDOR UNRESOLVED
          </div>
          <p>
            {game.birds === 0
              ? 'All birds were scattered by storm cells.'
              : 'You ran out of wind gusts before reaching the northern nest.'}
          </p>

          <button className="restart-button full-restart" onClick={handleRestart}>
            RETRY TODAY'S ROUTE ↻
          </button>

          <button
            className="secondary-action-btn"
            style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
            onClick={() => setShowArchiveModal(true)}
          >
            Practice an earlier flight 📅
          </button>
        </section>
      )}

      {/* Footer */}
      <footer className="game-footer">
        <span>COMMUNITY SAVED: {communityBirds.toLocaleString()} BIRDS</span>
        <span>WINDWARD © 2026 · DEVVIK DAILY</span>
      </footer>

      {/* HOW TO PLAY MODAL */}
      {showHelpModal && (
        <div className="modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>How to Play Windward</h2>
              <button className="close-button" onClick={() => setShowHelpModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-section">
              <p style={{ color: '#c4dcd3', fontSize: '12px', lineHeight: '1.6', margin: '0 0 12px' }}>
                Windward is a daily migratory routing puzzle. You do not control the birds directly—you summon prevailing
                wind gusts to guide them across the topographic corridor.
              </p>
            </div>

            <div className="modal-section">
              <h3>Corridor Elements</h3>
              <div className="modal-grid-help">
                <div className="help-card">
                  <span className="help-icon">🕊️</span>
                  <div>
                    <strong>Your Flock</strong>
                    <p>Starts with 5 birds. Protect as many as you can.</p>
                  </div>
                </div>

                <div className="help-card">
                  <span className="help-icon">💨</span>
                  <div>
                    <strong>Wind Gusts</strong>
                    <p>Choose N, S, E, or W. Limited budget per flight.</p>
                  </div>
                </div>

                <div className="help-card">
                  <span className="help-icon">↗</span>
                  <div>
                    <strong>Jet Streams</strong>
                    <p>Currents carry the flock 1 extra tile along their arrow for free.</p>
                  </div>
                </div>

                <div className="help-card">
                  <span className="help-icon">ϟ</span>
                  <div>
                    <strong>Storm Cells</strong>
                    <p>Turbulence scatters 1 bird. Avoid unless necessary!</p>
                  </div>
                </div>

                <div className="help-card">
                  <span className="help-icon">✧</span>
                  <div>
                    <strong>Waypoints</strong>
                    <p>Resting places that grant +150 bonus points for 3 stars.</p>
                  </div>
                </div>

                <div className="help-card">
                  <span className="help-icon">⌂</span>
                  <div>
                    <strong>Sanctuary Nest</strong>
                    <p>The northern goal. Reaching it completes the day's flight.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-section" style={{ marginTop: '16px' }}>
              <h3>Controls</h3>
              <p style={{ color: '#8ba29d', fontSize: '11px', margin: 0 }}>
                • On screen D-pad (North, South, East, West)<br />
                • Keyboard: WASD or Arrow Keys<br />
                • Click/tap adjacent tiles on the board directly<br />
                • Ctrl+Z or Undo button to rewind a gust
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE / FLIGHT SELECTOR MODAL */}
      {showArchiveModal && (
        <div className="modal-backdrop" onClick={() => setShowArchiveModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Flight Archive</h2>
              <button className="close-button" onClick={() => setShowArchiveModal(false)}>
                ✕
              </button>
            </div>

            <p style={{ color: '#8ba29d', fontSize: '11px', marginBottom: '14px' }}>
              Practice past corridors or test your routing skills across different migration weather patterns.
            </p>

            <div className="archive-list">
              {Array.from({ length: 7 }, (_, i) => {
                const day = Math.max(1, todayDayNumber - i);
                const info = generateDailyLevel(day);
                const isCurrent = day === currentDay;

                return (
                  <div
                    key={day}
                    className={`archive-item ${isCurrent ? 'active' : ''}`}
                    onClick={() => selectDay(day)}
                  >
                    <div>
                      <div className="archive-title">
                        Flight #{day.toString().padStart(3, '0')} · {info.title}
                        {day === todayDayNumber && <span style={{ color: '#9cc98d', marginLeft: '6px' }}>(Today)</span>}
                      </div>
                      <div className="archive-subtitle">
                        {info.region} · Par {info.parMoves} moves · {info.maxGusts} gusts
                      </div>
                    </div>
                    <span style={{ color: '#c4dcd3', fontSize: '14px' }}>↗</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STATS & COMMUNITY MODAL */}
      {showStatsModal && (
        <div className="modal-backdrop" onClick={() => setShowStatsModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Records & Streaks</h2>
              <button className="close-button" onClick={() => setShowStatsModal(false)}>
                ✕
              </button>
            </div>

            <div className="community-banner" style={{ margin: '0 0 16px' }}>
              <div className="community-stat">
                <span className="community-num">{currentStreak}</span>
                <span className="community-label">Current Streak</span>
              </div>
              <div className="community-divider" />
              <div className="community-stat">
                <span className="community-num">{maxStreak}</span>
                <span className="community-label">Max Streak</span>
              </div>
              <div className="community-divider" />
              <div className="community-stat">
                <span className="community-num">{totalFlights}</span>
                <span className="community-label">Total Flights</span>
              </div>
            </div>

            <div className="modal-section">
              <h3>Community Migration Total</h3>
              <p style={{ color: '#b2c7c1', fontSize: '12px', lineHeight: '1.6', margin: '4px 0 0' }}>
                Reddit pilots have safely guided <strong>{communityBirds.toLocaleString()} birds</strong> across mountain
                passes today, maintaining an overall survival rate of <strong>{survivalRate}%</strong>.
              </p>
            </div>

            <div className="modal-section" style={{ marginTop: '16px' }}>
              <h3>Subreddit Pilot</h3>
              <p style={{ color: '#8ba29d', fontSize: '11px', margin: 0 }}>
                Logged in as: <strong>u/{context.username ?? 'anonymous'}</strong> on{' '}
                <strong>r/{context.subredditName ?? 'windward_daily'}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WindwardApp />
  </StrictMode>
);
