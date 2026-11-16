import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  calculateDayNumber,
  getChamberForDay,
  simulateChamber,
  type LightColor,
  type OpticalPiece,
  type PrismInitResponse,
  type PrismLevel,
  type SubmitPrismRequest,
  type SubmitPrismResponse,
} from '../shared/api';
import { prismSounds } from './prism-audio';

const COLOR_HEX: Record<LightColor, string> = {
  red: '#ff2e54',
  green: '#00e676',
  blue: '#2979ff',
  yellow: '#ffd600',
  magenta: '#f50057',
  cyan: '#00e5ff',
  white: '#ffffff',
};

const COLOR_GLOW: Record<LightColor, string> = {
  red: 'rgba(255, 46, 84, 0.55)',
  green: 'rgba(0, 230, 118, 0.55)',
  blue: 'rgba(41, 121, 255, 0.55)',
  yellow: 'rgba(255, 214, 0, 0.55)',
  magenta: 'rgba(245, 0, 87, 0.55)',
  cyan: 'rgba(0, 229, 255, 0.55)',
  white: 'rgba(255, 255, 255, 0.75)',
};

export function PrismApp() {
  const todayDayNumber = useMemo(() => calculateDayNumber(), []);
  const [currentDay, setCurrentDay] = useState<number>(todayDayNumber);
  const [level, setLevel] = useState<PrismLevel>(() => getChamberForDay(todayDayNumber));

  // Pieces currently on the board or in inventory
  const [pieces, setPieces] = useState<OpticalPiece[]>(() =>
    level.availablePieces.map((p) => ({ ...p }))
  );
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const hasWonRef = useRef<boolean>(false);

  // Audio & Modals
  const [isMuted, setIsMuted] = useState<boolean>(() => prismSounds.isMuted());
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Community & user stats
  const [communityCrystals, setCommunityCrystals] = useState<number>(14820);
  const [totalSolves, setTotalSolves] = useState<number>(3840);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalAwakened, setTotalAwakened] = useState<number>(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // Fetch initial data from server
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/init');
        if (res.ok) {
          const data = (await res.json()) as PrismInitResponse;
          if (data.level) {
            setLevel(data.level);
            setPieces(data.level.availablePieces.map((p) => ({ ...p })));
            setCurrentDay(data.dayNumber);
          }
          if (data.communityStats) {
            setCommunityCrystals(data.communityStats.totalCrystalsAwakened);
            setTotalSolves(data.communityStats.totalSolves);
          }
          if (data.userStats) {
            setCurrentStreak(data.userStats.currentStreak);
            setMaxStreak(data.userStats.maxStreak);
            setTotalAwakened(data.userStats.totalChambersAwakened);
          }
        }
      } catch (err) {
        console.error('Error fetching PRISM init data:', err);
      }
    }
    void loadData();
  }, []);

  // Load past day chamber
  const selectChamber = useCallback((day: number) => {
    const newLvl = getChamberForDay(day);
    setCurrentDay(day);
    setLevel(newLvl);
    setPieces(newLvl.availablePieces.map((p) => ({ ...p })));
    setMoveCount(0);
    hasWonRef.current = false;
    setHasSubmitted(false);
    setSelectedPieceId(null);
    setShowArchiveModal(false);
  }, []);

  // Run real-time laser ray tracing simulation
  const simulation = useMemo(() => {
    return simulateChamber(level.gridSize, level.emitters, pieces, level.walls, level.crystals);
  }, [level, pieces]);

  // Submit score on chamber awakening
  const submitSolution = useCallback(
    async (finalMoves: number) => {
      if (hasSubmitted) return;
      setHasSubmitted(true);

      const score = 1000 + Math.max(0, level.parMoves - finalMoves) * 200 + level.crystals.length * 250;
      const payload: SubmitPrismRequest = {
        dayNumber: currentDay,
        won: true,
        moves: finalMoves,
        parMoves: level.parMoves,
        crystalsAwakened: level.crystals.length,
        score,
      };

      try {
        const res = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const resp = (await res.json()) as SubmitPrismResponse;
          if (resp.newStreak !== undefined) {
            setCurrentStreak(resp.newStreak);
          }
          if (resp.totalCrystalsAwakened !== undefined) {
            setCommunityCrystals(resp.totalCrystalsAwakened);
          }
        }
      } catch (err) {
        console.error('Error submitting PRISM solution:', err);
      }
    },
    [currentDay, hasSubmitted, level.crystals.length, level.parMoves]
  );

  const hasWon = simulation.isSolved;

  // Watch for chamber solved state
  useEffect(() => {
    if (simulation.isSolved && !hasWonRef.current) {
      hasWonRef.current = true;
      prismSounds.playChamberComplete();
      void submitSolution(moveCount);
    }
  }, [simulation.isSolved, moveCount, submitSolution]);

  // Handle cell click (place piece or rotate existing piece)
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (hasWon) return;

      // Check if wall or crystal is here
      const isWall = level.walls.some((w) => w.row === row && w.col === col);
      if (isWall) return;

      // Check if a piece is already in this cell
      const existingPieceIndex = pieces.findIndex(
        (p) => p.position && p.position.row === row && p.position.col === col
      );

      if (existingPieceIndex !== -1) {
        const existing = pieces[existingPieceIndex];
        if (existing && existing.type === 'mirror') {
          // Rotate mirror angle
          prismSounds.playClick();
          setPieces((prev) => {
            const next = [...prev];
            const p = next[existingPieceIndex]!;
            next[existingPieceIndex] = {
              ...p,
              angle: p.angle === 'forward' ? 'backward' : 'forward',
            };
            return next;
          });
          setMoveCount((c) => c + 1);
        }
        return;
      }

      // If empty cell and a piece is selected from inventory: place it!
      if (selectedPieceId) {
        const pieceIndex = pieces.findIndex((p) => p.id === selectedPieceId);
        if (pieceIndex !== -1) {
          prismSounds.playClick();
          setPieces((prev) => {
            const next = [...prev];
            const p = next[pieceIndex]!;
            next[pieceIndex] = {
              ...p,
              position: { row, col },
            };
            return next;
          });
          setMoveCount((c) => c + 1);
          setSelectedPieceId(null);
        }
      }
    },
    [hasWon, level.walls, pieces, selectedPieceId]
  );

  // Return a placed piece to inventory
  const handleReturnToInventory = useCallback(
    (pieceId: string) => {
      if (hasWon) return;
      prismSounds.playClick();
      setPieces((prev) =>
        prev.map((p) => (p.id === pieceId ? { ...p, position: undefined } : p))
      );
      setSelectedPieceId(null);
    },
    [hasWon]
  );

  // Reset entire chamber
  const handleReset = useCallback(() => {
    prismSounds.playClick();
    setPieces(level.availablePieces.map((p) => ({ ...p })));
    setMoveCount(0);
    hasWonRef.current = false;
    setHasSubmitted(false);
    setSelectedPieceId(null);
  }, [level]);

  // Toggle sound
  const toggleSound = useCallback(() => {
    const muted = prismSounds.toggleMute();
    setIsMuted(muted);
    showToast(muted ? '🔇 Sound muted' : '🔊 Sound enabled');
  }, [showToast]);

  // Star rating
  const stars = useMemo(() => {
    if (!hasWon) return 0;
    if (moveCount <= level.parMoves) return 3;
    if (moveCount <= level.parMoves + 2) return 2;
    return 1;
  }, [hasWon, moveCount, level.parMoves]);

  const score = useMemo(() => {
    return 1000 + Math.max(0, level.parMoves - moveCount) * 200 + level.crystals.length * 250;
  }, [level.parMoves, moveCount, level.crystals.length]);

  // Reddit comment sharing
  const handleShare = useCallback(() => {
    const starText = stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐' : '⭐';
    const paddedDay = currentDay.toString().padStart(3, '0');
    const subreddit = context.subredditName ?? 'windward_daily_dev';

    const shareText = [
      `💎 PRISM #${paddedDay} ${starText}`,
      `Awakened in ${moveCount} moves (Par: ${level.parMoves})`,
      `Score: ${score.toLocaleString()}${currentStreak > 0 ? ` · Streak: ${currentStreak} 🔥` : ''}`,
      '',
      '🔴 ➔ 🪞 ➔ 💎 (Violet)',
      '🟢 ➔ 🪞 ➔ 💎 (Amber)',
      '',
      `Awaken today on r/${subreddit}!`,
    ].join('\n');

    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        showToast('📋 Copied chamber record! Paste into Reddit comments below.');
      })
      .catch(() => {
        showToast('Recorded chamber solve! Paste to Reddit comments.');
      });
  }, [stars, currentDay, moveCount, level.parMoves, score, currentStreak, showToast]);

  // Inventory pieces not yet on the board
  const inventoryPieces = useMemo(() => {
    return pieces.filter((p) => !p.position);
  }, [pieces]);

  return (
    <main className="prism-app">
      {/* Toast Alert */}
      {toastMessage && <div className="windward-toast">{toastMessage}</div>}

      {/* Top Bar Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">💎</div>
          <div>
            <div className="brand-name">PRISM</div>
            <div className="brand-caption">LIGHT SYNTHESIS</div>
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
            aria-label="Records & Streaks"
            title="Records & Streaks"
          >
            🏆
          </button>

          <button
            className="icon-button"
            onClick={() => setShowArchiveModal(true)}
            aria-label="Past Chambers Archive"
            title="Chamber Archive"
          >
            📅
          </button>

          <div className="daily-badge">
            <span className="live-dot" />
            CHAMBER #{currentDay.toString().padStart(3, '0')}
          </div>
        </div>
      </header>

      {/* Title & Objectives */}
      <section className="intro">
        <div className="eyebrow">{level.title.toUpperCase()} · PAR {level.parMoves} MOVES</div>
        <h1>
          Awaken the <span>crystals.</span>
        </h1>
        <p>{level.subtitle}</p>
      </section>

      {/* Live HUD Stats */}
      <section className="stats" aria-label="Chamber statistics">
        <div className="stat-card">
          <span className="stat-label">CRYSTALS AWAKENED</span>
          <strong>
            {simulation.crystals.filter((c) => c.isSatisfied).length}
            <small> / {level.crystals.length}</small>
          </strong>
          <span className="stat-icon">💎</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">MOVES USED</span>
          <strong style={{ color: moveCount <= level.parMoves ? '#9cc98d' : '#eabf78' }}>
            {moveCount}
            <small> / PAR {level.parMoves}</small>
          </strong>
          <span className="stat-icon">⚡</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">UNPLACED PIECES</span>
          <strong>
            {inventoryPieces.length}
            <small> LEFT</small>
          </strong>
          <span className="stat-icon">🪞</span>
        </div>
      </section>

      {/* Optical Chamber Board (5x5 Grid with SVG laser beam overlay) */}
      <section className="board-section">
        <div className="board-heading">
          <div>
            <span className="section-label">OPTICAL RESONANCE GRID</span>
            <span className="board-subtitle">Tap empty cell to place mirror · Tap placed mirror to rotate 90°</span>
          </div>
          <span className="level-marker">{level.gridSize} × {level.gridSize}</span>
        </div>

        <div className="chamber-wrapper">
          {/* Edge Emitter Markers */}
          {level.emitters.map((emitter) => {
            const emitterClass = `emitter-node emitter-${emitter.direction} emitter-color-${emitter.color}`;

            let topStyle = '0%';
            let leftStyle = '0%';

            if (emitter.direction === 'down') {
              topStyle = '-14px';
              leftStyle = `${(emitter.col + 0.5) * (100 / level.gridSize)}%`;
            } else if (emitter.direction === 'up') {
              topStyle = 'calc(100% + 2px)';
              leftStyle = `${(emitter.col + 0.5) * (100 / level.gridSize)}%`;
            } else if (emitter.direction === 'right') {
              topStyle = `${(emitter.row + 0.5) * (100 / level.gridSize)}%`;
              leftStyle = '-14px';
            } else if (emitter.direction === 'left') {
              topStyle = `${(emitter.row + 0.5) * (100 / level.gridSize)}%`;
              leftStyle = 'calc(100% + 2px)';
            }

            return (
              <div
                key={emitter.id}
                className={emitterClass}
                style={{
                  top: topStyle,
                  left: leftStyle,
                  transform: 'translate(-50%, -50%)',
                }}
                title={`${emitter.color.toUpperCase()} laser emitter`}
              >
                <span className="emitter-arrow">
                  {emitter.direction === 'down'
                    ? '▼'
                    : emitter.direction === 'up'
                      ? '▲'
                      : emitter.direction === 'right'
                        ? '▶'
                        : '◀'}
                </span>
              </div>
            );
          })}

          {/* Grid Cells */}
          <div
            className="prism-grid"
            style={{
              gridTemplateColumns: `repeat(${level.gridSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${level.gridSize}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: level.gridSize }).map((_, r) =>
              Array.from({ length: level.gridSize }).map((_, c) => {
                const isWall = level.walls.some((w) => w.row === r && w.col === c);
                const crystal = simulation.crystals.find((cr) => cr.row === r && cr.col === c);
                const piece = pieces.find(
                  (p) => p.position && p.position.row === r && p.position.col === c
                );

                const isTargetCell = !isWall && !piece && selectedPieceId !== null;

                let cellClass = 'prism-cell';
                if (isWall) cellClass += ' cell-wall';
                if (isTargetCell) cellClass += ' cell-target-highlight';
                if (crystal?.isSatisfied) cellClass += ' cell-crystal-awakened';

                return (
                  <div
                    key={`${r}-${c}`}
                    className={cellClass}
                    onClick={() => handleCellClick(r, c)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Cell row ${r + 1}, column ${c + 1}`}
                  >
                    {/* Obsidian Wall */}
                    {isWall && <div className="wall-block" title="Obsidian Wall (Absorbs light)" />}

                    {/* Target Crystal */}
                    {crystal && (
                      <div
                        className={`crystal-gem ${crystal.isSatisfied ? 'crystal-active' : ''}`}
                        style={{
                          color: COLOR_HEX[crystal.targetColor],
                          filter: crystal.isSatisfied
                            ? `drop-shadow(0 0 12px ${COLOR_GLOW[crystal.targetColor]})`
                            : undefined,
                        }}
                        title={`Target: ${crystal.targetColor.toUpperCase()} (${crystal.isSatisfied ? 'Awakened!' : 'Inactive'})`}
                      >
                        <span className="crystal-symbol">💎</span>
                        <span
                          className="crystal-color-pill"
                          style={{
                            background: COLOR_HEX[crystal.targetColor],
                          }}
                        />
                      </div>
                    )}

                    {/* Placed Mirror */}
                    {piece && piece.type === 'mirror' && (
                      <div
                        className={`mirror-piece angle-${piece.angle}`}
                        title="Angle Mirror (Tap to rotate 90°)"
                      >
                        <div className="mirror-surface" />
                        <span className="mirror-icon">🪞</span>
                        <button
                          className="remove-piece-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReturnToInventory(piece.id);
                          }}
                          title="Return to inventory"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* SVG Real-Time Laser Rays Overlay */}
          <svg className="laser-svg-canvas" viewBox={`0 0 ${level.gridSize * 100} ${level.gridSize * 100}`}>
            <defs>
              <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {simulation.beams.map((beam, idx) => {
              const x1 = (beam.fromCol + 0.5) * 100;
              const y1 = (beam.fromRow + 0.5) * 100;
              const x2 = (beam.toCol + 0.5) * 100;
              const y2 = (beam.toRow + 0.5) * 100;
              const colorHex = COLOR_HEX[beam.color];

              return (
                <g key={`beam-${idx}`}>
                  {/* Outer vibrant glow path */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={colorHex}
                    strokeWidth="6"
                    strokeLinecap="round"
                    opacity="0.6"
                    filter="url(#laser-glow)"
                  />
                  {/* Inner bright core beam */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Color Synthesis Legend */}
        <div className="legend">
          <span>
            <i style={{ color: COLOR_HEX.red }}>●</i> Red
          </span>
          <span>
            <i style={{ color: COLOR_HEX.green }}>●</i> Green
          </span>
          <span>
            <i style={{ color: COLOR_HEX.blue }}>●</i> Blue
          </span>
          <span>
            <i style={{ color: COLOR_HEX.magenta }}>●</i> Violet (R+B)
          </span>
          <span>
            <i style={{ color: COLOR_HEX.yellow }}>●</i> Amber (R+G)
          </span>
          <span>
            <i style={{ color: COLOR_HEX.cyan }}>●</i> Cyan (G+B)
          </span>
          <span>
            <i style={{ color: COLOR_HEX.white }}>●</i> White (R+G+B)
          </span>
        </div>
      </section>

      {/* Optical Inventory Dock */}
      <section className="inventory-section">
        <div className="controls-heading">
          <div>
            <span className="section-label">OPTICAL INVENTORY</span>
            <span className="board-subtitle">Tap a mirror, then tap any empty cell to place</span>
          </div>
          <span className="keyboard-hint">{inventoryPieces.length} UNPLACED</span>
        </div>

        <div className="inventory-rack">
          {inventoryPieces.length === 0 ? (
            <div className="inventory-empty-msg">All optical mirrors placed on grid. Tap placed mirrors to rotate 90°.</div>
          ) : (
            inventoryPieces.map((p) => {
              const isSelected = selectedPieceId === p.id;
              return (
                <button
                  key={p.id}
                  className={`inventory-slot ${isSelected ? 'slot-selected' : ''}`}
                  onClick={() => {
                    prismSounds.playClick();
                    setSelectedPieceId(isSelected ? null : p.id);
                  }}
                  title={`Angle Mirror (${p.angle === 'forward' ? '/' : '\\'}) - Tap to select`}
                >
                  <span className="inventory-mirror-icon">🪞</span>
                  <span className="inventory-label">
                    Mirror {p.angle === 'forward' ? '/' : '\\'}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-row">
          <button className="secondary-action-btn" onClick={handleReset} title="Reset all mirrors">
            <span>↻</span>
            <span>Reset Chamber</span>
          </button>
        </div>
      </section>

      {/* Chamber Solved Result Card */}
      {hasWon && (
        <section className="result-card">
          <div className="result-eyebrow">
            {stars === 3 ? 'FLAWLESS SYNTHESIS ⭐⭐⭐' : stars === 2 ? 'EXCELLENT OPTICS ⭐⭐' : 'CHAMBER AWAKENED ⭐'}
          </div>

          <div className="result-score">{score.toLocaleString()}</div>
          <div className="result-caption">TOTAL OPTICAL SCORE</div>

          <p>
            All {level.crystals.length} crystals awakened in {moveCount} moves (Par: {level.parMoves} moves).
          </p>

          <button className="share-btn" onClick={handleShare}>
            <span>📋</span>
            <span>SHARE RECORD TO REDDIT COMMENTS</span>
          </button>

          <button className="restart-button full-restart" onClick={handleReset}>
            EXPERIMENT AGAIN ↻
          </button>
        </section>
      )}

      {/* Footer */}
      <footer className="game-footer">
        <span>COMMUNITY CRYSTALS: {communityCrystals.toLocaleString()}</span>
        <span>PRISM © 2026 · DAILY LIGHT SYNTHESIS</span>
      </footer>

      {/* HOW TO PLAY MODAL */}
      {showHelpModal && (
        <div className="modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>How to Play PRISM</h2>
              <button className="close-button" onClick={() => setShowHelpModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-section">
              <p style={{ color: '#c4dcd3', fontSize: '12px', lineHeight: '1.6', margin: '0 0 12px' }}>
                PRISM is a daily optical synthesis puzzle. Your goal is to guide primary laser beams (Red, Green, Blue)
                across the chamber to awaken the target crystals with their required synthesized colors.
              </p>
            </div>

            <div className="modal-section">
              <h3>Additive Color Synthesis</h3>
              <div className="modal-grid-help">
                <div className="help-card">
                  <span className="help-icon" style={{ color: COLOR_HEX.magenta }}>🟣</span>
                  <div>
                    <strong>Violet (Magenta)</strong>
                    <p>Red laser + Blue laser</p>
                  </div>
                </div>

                <div className="help-card">
                  <span className="help-icon" style={{ color: COLOR_HEX.yellow }}>🟡</span>
                  <div>
                    <strong>Amber (Yellow)</strong>
                    <p>Red laser + Green laser</p>
                  </div>
                </div>

                <div className="help-card">
                  <span className="help-icon" style={{ color: COLOR_HEX.cyan }}>🔵</span>
                  <div>
                    <strong>Cyan</strong>
                    <p>Green laser + Blue laser</p>
                  </div>
                </div>

                <div className="help-card">
                  <span className="help-icon" style={{ color: COLOR_HEX.white }}>⚪</span>
                  <div>
                    <strong>Pure Radiance</strong>
                    <p>Red + Green + Blue</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-section" style={{ marginTop: '16px' }}>
              <h3>Controls</h3>
              <p style={{ color: '#8ba29d', fontSize: '11px', margin: 0 }}>
                • Tap any mirror in your inventory, then tap an empty cell to place it.<br />
                • Tap a placed mirror on the grid to rotate its reflective angle 90°.<br />
                • Tap the '✕' on a mirror to return it to your inventory.<br />
                • Beat the Par move target for 3 stars!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ARCHIVE MODAL */}
      {showArchiveModal && (
        <div className="modal-backdrop" onClick={() => setShowArchiveModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Chamber Archive</h2>
              <button className="close-button" onClick={() => setShowArchiveModal(false)}>
                ✕
              </button>
            </div>

            <p style={{ color: '#8ba29d', fontSize: '11px', marginBottom: '14px' }}>
              Practice past optical chambers to hone your light reflection and color mixing skills.
            </p>

            <div className="archive-list">
              {Array.from({ length: 6 }, (_, i) => {
                const day = Math.max(1, todayDayNumber - i);
                const info = getChamberForDay(day);
                const isCurrent = day === currentDay;

                return (
                  <div
                    key={day}
                    className={`archive-item ${isCurrent ? 'active' : ''}`}
                    onClick={() => selectChamber(day)}
                  >
                    <div>
                      <div className="archive-title">
                        Chamber #{day.toString().padStart(3, '0')} · {info.title}
                        {day === todayDayNumber && <span style={{ color: '#9cc98d', marginLeft: '6px' }}>(Today)</span>}
                      </div>
                      <div className="archive-subtitle">
                        Par {info.parMoves} moves · {info.crystals.length} crystals
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

      {/* STATS & STREAKS MODAL */}
      {showStatsModal && (
        <div className="modal-backdrop" onClick={() => setShowStatsModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Optician Records & Streaks</h2>
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
                <span className="community-num">{totalAwakened}</span>
                <span className="community-label">Total Solves</span>
              </div>
            </div>

            <div className="modal-section">
              <h3>Community Lumens Awakened</h3>
              <p style={{ color: '#b2c7c1', fontSize: '12px', lineHeight: '1.6', margin: '4px 0 0' }}>
                Reddit opticians have awakened <strong>{communityCrystals.toLocaleString()} crystals</strong> across{' '}
                <strong>{totalSolves.toLocaleString()} chambers</strong> worldwide today.
              </p>
            </div>

            <div className="modal-section" style={{ marginTop: '16px' }}>
              <h3>Subreddit Optician</h3>
              <p style={{ color: '#8ba29d', fontSize: '11px', margin: 0 }}>
                Logged in as: <strong>u/{context.username ?? 'anonymous'}</strong> on{' '}
                <strong>r/{context.subredditName ?? 'windward_daily_dev'}</strong>.
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
    <PrismApp />
  </StrictMode>
);
