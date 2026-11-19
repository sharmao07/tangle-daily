import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  calculateDayNumber,
  evaluateGraph,
  getTangleLevelForDay,
  getUserRank,
  type GraphNode,
  type LeaderboardEntry,
  type SubmitTangleRequest,
  type SubmitTangleResponse,
  type TangleInitResponse,
  type TangleLevel,
  type WeeklyDayStatus,
} from '../shared/api';
import { tangleSounds } from './tangle-audio';

interface Spark {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function TangleApp() {
  const todayDayNumber = useMemo(() => calculateDayNumber(), []);
  const [currentDay, setCurrentDay] = useState<number>(todayDayNumber);
  const [level, setLevel] = useState<TangleLevel>(() => getTangleLevelForDay(todayDayNumber));

  // Graph nodes
  const [nodes, setNodes] = useState<GraphNode[]>(() => level.nodes.map((n) => ({ ...n })));
  const [undoStack, setUndoStack] = useState<GraphNode[][]>([]);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  // Timer & Victory animation
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [showVictoryRipple, setShowVictoryRipple] = useState<boolean>(false);

  // Active interaction
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showTensionHint, setShowTensionHint] = useState<boolean>(false);
  const [sparks, setSparks] = useState<Spark[]>([]);

  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const previousCrossingsRef = useRef<number>(level.initialCrossings);
  const hasWonRef = useRef<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Audio & Modals
  const [isMuted, setIsMuted] = useState<boolean>(() => tangleSounds.isMuted());
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Community, user stats & leaderboard
  const [totalSolved, setTotalSolved] = useState<number>(3420);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalUntangled, setTotalUntangled] = useState<number>(0);
  const [userRank, setUserRank] = useState<string>(() => getUserRank(0));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userDailyRank, setUserDailyRank] = useState<number | undefined>(undefined);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [weeklyHistory, setWeeklyHistory] = useState<WeeklyDayStatus[]>([]);
  const [flairAwarded, setFlairAwarded] = useState<string | null>(null);

  const filterId = useId();

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // Timer interval: ticks while actively untangling
  useEffect(() => {
    if (hasWonRef.current) return;

    const timer = setInterval(() => {
      if (!hasWonRef.current) {
        setElapsedSeconds((s) => s + 1);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch initial data from server
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/init');
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = (await res.json()) as TangleInitResponse;
          if (data.level) {
            setLevel(data.level);
            setNodes(data.level.nodes.map((n) => ({ ...n })));
            setCurrentDay(data.dayNumber);
            previousCrossingsRef.current = data.level.initialCrossings;
          }
          if (data.communityStats) {
            setTotalSolved(data.communityStats.totalSolved);
          }
          if (data.avatarUrl || data.userStats?.avatarUrl) {
            setAvatarUrl(data.avatarUrl || data.userStats?.avatarUrl || null);
          }
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
          if (data.userStats) {
            setCurrentStreak(data.userStats.currentStreak);
            setMaxStreak(data.userStats.maxStreak);
            setTotalUntangled(data.userStats.totalSolved);
            setUserRank(data.userStats.rankTitle || getUserRank(data.userStats.currentStreak));
            if (data.userStats.userDailyRank !== undefined) {
              setUserDailyRank(data.userStats.userDailyRank);
            }
            if (data.userStats.weeklyHistory) {
              setWeeklyHistory(data.userStats.weeklyHistory);
            }
          }
        }
      } catch (err) {
        console.error('Error loading Tangle init data:', err);
      }
    }
    void loadData();
  }, []);

  // Load a past day
  const selectDay = useCallback((day: number) => {
    const newLvl = getTangleLevelForDay(day);
    setCurrentDay(day);
    setLevel(newLvl);
    setNodes(newLvl.nodes.map((n) => ({ ...n })));
    setUndoStack([]);
    setMoveCount(0);
    setElapsedSeconds(0);
    setHasSubmitted(false);
    hasWonRef.current = false;
    previousCrossingsRef.current = newLvl.initialCrossings;
    setDraggingNodeId(null);
    setSelectedNodeId(null);
    setShowTensionHint(false);
    setShowVictoryRipple(false);
    setSparks([]);
    setShowArchiveModal(false);
  }, []);

  // Graph evaluation
  const evaluation = useMemo(() => {
    return evaluateGraph(nodes, level.edges);
  }, [nodes, level.edges]);

  const hasWon = evaluation.crossingsCount === 0;

  // Nodes map for O(1) edge lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [nodes]);

  // Tension hotspot calculation: which node is connected to the most crossing edges?
  const hotNodeId = useMemo(() => {
    if (!showTensionHint || evaluation.crossingsCount === 0) return null;

    const crossingEdgeSet = evaluation.edgeCrossingMap;
    const nodeScores = new Map<string, number>();

    for (const edge of level.edges) {
      if (crossingEdgeSet.has(edge.id)) {
        nodeScores.set(edge.source, (nodeScores.get(edge.source) ?? 0) + 1);
        nodeScores.set(edge.target, (nodeScores.get(edge.target) ?? 0) + 1);
      }
    }

    let bestId: string | null = null;
    let maxCrossingCount = 0;
    for (const [id, count] of nodeScores.entries()) {
      if (count > maxCrossingCount) {
        maxCrossingCount = count;
        bestId = id;
      }
    }
    return bestId;
  }, [showTensionHint, evaluation.crossingsCount, evaluation.edgeCrossingMap, level.edges]);

  // Submit score on untangle
  const submitSolution = useCallback(
    async (finalMoves: number, timeSpent: number) => {
      if (hasSubmitted) return;
      setHasSubmitted(true);

      const score = 1000 + Math.max(0, level.parMoves - finalMoves) * 150 + level.nodes.length * 50;
      const payload: SubmitTangleRequest = {
        dayNumber: currentDay,
        won: true,
        moves: finalMoves,
        parMoves: level.parMoves,
        initialCrossings: level.initialCrossings,
        score,
        timeSeconds: timeSpent,
      };

      try {
        const res = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const resp = (await res.json()) as SubmitTangleResponse;
          if (resp.newStreak !== undefined) {
            setCurrentStreak(resp.newStreak);
          }
          if (resp.totalKnotsUntangled !== undefined) {
            setTotalSolved(resp.totalKnotsUntangled);
          }
          if (resp.rankTitle) {
            setUserRank(resp.rankTitle);
          }
          if (resp.userDailyRank !== undefined) {
            setUserDailyRank(resp.userDailyRank);
          }
          if (resp.leaderboard) {
            setLeaderboard(resp.leaderboard);
          }
          if (resp.userFlairAwarded) {
            setFlairAwarded(resp.userFlairAwarded);
          }
        }
      } catch (err) {
        console.error('Error submitting tangle solution:', err);
      }
    },
    [currentDay, hasSubmitted, level.initialCrossings, level.nodes.length, level.parMoves]
  );

  // Watch for solve
  useEffect(() => {
    if (hasWon && !hasWonRef.current) {
      hasWonRef.current = true;
      setShowVictoryRipple(true);
      tangleSounds.playSolved();
      void submitSolution(moveCount, elapsedSeconds);
    }
  }, [hasWon, moveCount, elapsedSeconds, submitSolution]);

  // Spawn visual sparks
  const triggerSparks = useCallback((cx: number, cy: number) => {
    const count = 10;
    const newSparks: Spark[] = [];
    const baseId = Date.now();

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count + (Math.random() * 0.4 - 0.2);
      const speed = 12 + Math.random() * 18;
      newSparks.push({
        id: baseId + i,
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      });
    }

    setSparks((prev) => [...prev, ...newSparks]);
    setTimeout(() => {
      setSparks((prev) => prev.filter((s) => !newSparks.some((ns) => ns.id === s.id)));
    }, 450);
  }, []);

  // Pointer Drag Handlers (calibrated touch drag with zero false moves on tap)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>, nodeId: string) => {
      if (hasWon) return;
      e.stopPropagation();

      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        dragStartPosRef.current = { x: node.x, y: node.y };
        dragStartScreenPosRef.current = { x: e.clientX, y: e.clientY };
        hasDraggedRef.current = false;
      }

      setDraggingNodeId(nodeId);
      setSelectedNodeId(nodeId);

      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }
    },
    [hasWon, nodes]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingNodeId || hasWon || !containerRef.current) return;

      const screenStart = dragStartScreenPosRef.current;
      if (screenStart) {
        const screenDist = Math.hypot(e.clientX - screenStart.x, e.clientY - screenStart.y);
        // Require meaningful pointer movement before initiating drag (filters out taps / micro-shakes)
        if (screenDist < 8 && !hasDraggedRef.current) {
          return;
        }
      }

      if (!hasDraggedRef.current) {
        hasDraggedRef.current = true;
        tangleSounds.playGrab();
      }

      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left) / rect.width;
      const rawY = (e.clientY - rect.top) / rect.height;

      // Restrict pins within comfortable interior margin
      const clampedX = Math.max(0.08, Math.min(0.92, rawX));
      const clampedY = Math.max(0.08, Math.min(0.92, rawY));

      setNodes((prev) =>
        prev.map((n) => (n.id === draggingNodeId ? { ...n, x: clampedX, y: clampedY } : n))
      );
    },
    [draggingNodeId, hasWon]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingNodeId) return;

      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // Fallback
      }

      const currentNode = nodes.find((n) => n.id === draggingNodeId);
      const startPos = dragStartPosRef.current;

      // Only count as a move if pin was actually dragged and displaced >= 3.5% of the board
      if (hasDraggedRef.current && currentNode && startPos) {
        const dx = currentNode.x - startPos.x;
        const dy = currentNode.y - startPos.y;
        const dist = Math.hypot(dx, dy);

        if (dist >= 0.035) {
          // Push previous positions to undo stack
          setUndoStack((prev) => [
            ...prev,
            nodes.map((n) =>
              n.id === draggingNodeId ? { ...n, x: startPos.x, y: startPos.y } : { ...n }
            ),
          ]);
          setMoveCount((c) => c + 1);
          tangleSounds.playDrop();

          if (evaluation.crossingsCount < previousCrossingsRef.current) {
            tangleSounds.playUncross(evaluation.crossingsCount);
            triggerSparks(currentNode.x * 1000, currentNode.y * 1000);
          }
          previousCrossingsRef.current = evaluation.crossingsCount;
        } else {
          // Snap back if moved less than threshold: zero moves counted
          setNodes((prev) =>
            prev.map((n) => (n.id === draggingNodeId ? { ...n, x: startPos.x, y: startPos.y } : n))
          );
        }
      } else if (!hasDraggedRef.current && startPos) {
        // Pure tap or touch without drag: restore exact position, 0 moves counted
        setNodes((prev) =>
          prev.map((n) => (n.id === draggingNodeId ? { ...n, x: startPos.x, y: startPos.y } : n))
        );
      }

      setDraggingNodeId(null);
      dragStartPosRef.current = null;
      dragStartScreenPosRef.current = null;
      hasDraggedRef.current = false;
    },
    [draggingNodeId, evaluation.crossingsCount, nodes, triggerSparks]
  );

  // Keyboard navigation & accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, nodeId: string) => {
      if (hasWon) return;

      const step = e.shiftKey ? 0.05 : 0.02;
      let dx = 0;
      let dy = 0;

      if (e.key === 'ArrowUp' || e.key === 'w') dy = -step;
      else if (e.key === 'ArrowDown' || e.key === 's') dy = step;
      else if (e.key === 'ArrowLeft' || e.key === 'a') dx = -step;
      else if (e.key === 'ArrowRight' || e.key === 'd') dx = step;
      else if (e.key === 'Escape') {
        setSelectedNodeId(null);
        return;
      } else {
        return;
      }

      e.preventDefault();

      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;

      const newX = Math.max(0.08, Math.min(0.92, target.x + dx));
      const newY = Math.max(0.08, Math.min(0.92, target.y + dy));

      // Push current to undo
      setUndoStack((prev) => [...prev, nodes.map((n) => ({ ...n }))]);
      setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, x: newX, y: newY } : n))
      );
      setMoveCount((c) => c + 1);
      tangleSounds.playDrop();

      if (evaluation.crossingsCount < previousCrossingsRef.current) {
        tangleSounds.playUncross(evaluation.crossingsCount);
        triggerSparks(newX * 1000, newY * 1000);
      }
      previousCrossingsRef.current = evaluation.crossingsCount;
    },
    [evaluation.crossingsCount, hasWon, nodes, triggerSparks]
  );

  // Undo move
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || hasWon) return;
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;

    tangleSounds.playGrab();
    setNodes(previous);
    setUndoStack((prev) => prev.slice(0, -1));
    setMoveCount((c) => Math.max(0, c - 1));
  }, [hasWon, undoStack]);

  // Reset knot
  const handleReset = useCallback(() => {
    tangleSounds.playGrab();
    setNodes(level.nodes.map((n) => ({ ...n })));
    setUndoStack([]);
    setMoveCount(0);
    setElapsedSeconds(0);
    setHasSubmitted(false);
    hasWonRef.current = false;
    previousCrossingsRef.current = level.initialCrossings;
    setDraggingNodeId(null);
    setSelectedNodeId(null);
    setShowTensionHint(false);
    setShowVictoryRipple(false);
  }, [level]);

  // Tension hint toggle
  const toggleTensionHint = useCallback(() => {
    setShowTensionHint((prev) => {
      const next = !prev;
      if (next) {
        showToast('Highlighted pin connects to the most crossed threads');
      }
      return next;
    });
  }, [showToast]);

  // Sound toggle
  const toggleSound = useCallback(() => {
    const muted = tangleSounds.toggleMute();
    setIsMuted(muted);
    showToast(muted ? 'Sound muted' : 'Sound enabled');
  }, [showToast]);

  // Stars calculation
  const stars = useMemo(() => {
    if (!hasWon) return 0;
    if (moveCount <= level.parMoves) return 3;
    if (moveCount <= level.parMoves + 2) return 2;
    return 1;
  }, [hasWon, moveCount, level.parMoves]);

  const score = useMemo(() => {
    return 1000 + Math.max(0, level.parMoves - moveCount) * 150 + level.nodes.length * 50;
  }, [level.nodes.length, level.parMoves, moveCount]);

  // Reddit Share
  const handleShare = useCallback(() => {
    const starText = stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐' : '⭐';
    const paddedDay = currentDay.toString().padStart(3, '0');
    const subreddit = (typeof context !== 'undefined' && context?.subredditName) ? context.subredditName : 'tangle_daily';
    const timeFormatted = `${Math.floor(elapsedSeconds / 60)}m ${(elapsedSeconds % 60).toString().padStart(2, '0')}s`;
    const rankLine = userDailyRank !== undefined ? ` · Daily Rank: #${userDailyRank}` : '';

    const shareText = [
      `TANGLE #${paddedDay} · Daily Knot ${starText}`,
      `Rank: ${userRank}${currentStreak > 0 ? ` · Streak: ${currentStreak} day${currentStreak === 1 ? '' : 's'}` : ''}${rankLine}`,
      `Solved in ${moveCount} moves (Par: ${level.parMoves}) · ${timeFormatted}`,
      `Crossings: ${level.initialCrossings} ➔ 0 · Score: ${score.toLocaleString()}`,
      '',
      `Untangle today on r/${subreddit}`,
    ].join('\n');

    navigator.clipboard
      .writeText(shareText)
      .then(() => {
        showToast('Copied knot record to clipboard. Paste into Reddit comments.');
      })
      .catch(() => {
        showToast('Recorded knot solve. Share to Reddit.');
      });
  }, [stars, currentDay, userRank, currentStreak, userDailyRank, moveCount, level.parMoves, elapsedSeconds, level.initialCrossings, score, showToast]);

  return (
    <main className="tangle-app">
      {/* Toast */}
      {toastMessage && <div className="toast-box">{toastMessage}</div>}

      {/* Header */}
      <header className="topbar">
        <div className="brand">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Snoovatar" className="snoo-avatar-mini" />
          ) : (
            <div className="brand-mark" />
          )}
          <span className="brand-name">Tangle</span>
          <span className="archetype-tag">{level.archetype}</span>
        </div>

        <div className="header-meta">
          <button
            className="icon-btn"
            onClick={toggleSound}
            aria-label="Toggle sound"
            title="Toggle sound"
          >
            {isMuted ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>

          <button
            className="icon-btn"
            onClick={() => setShowHelpModal(true)}
            aria-label="How to play"
            title="How to play"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          <button
            className="icon-btn"
            onClick={() => setShowLeaderboardModal(true)}
            aria-label="Subreddit Leaderboard"
            title="Subreddit Leaderboard"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
              <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34" />
              <path d="M12 2v20" />
              <path d="M6 4h12a2 2 0 0 1 2 2v4a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2Z" />
            </svg>
          </button>

          <button
            className="icon-btn"
            onClick={() => setShowStatsModal(true)}
            aria-label="Records & streaks"
            title="Records & streaks"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>

          <button
            className="icon-btn"
            onClick={() => setShowArchiveModal(true)}
            aria-label="Past knots"
            title="Past knots"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>

          <span className="daily-label">#{currentDay.toString().padStart(3, '0')}</span>
        </div>
      </header>

      {/* Headline & Live Metrics */}
      <section className="status-bar">
        <div className="headline-wrap">
          <h1>{level.title}</h1>
          <p>Drag pins until zero lines cross</p>
        </div>

        <div className="metrics-group">
          <div className="metric-pill">
            <span>Crossings</span>
            <strong className={evaluation.crossingsCount === 0 ? 'cleared' : 'tension'}>
              {evaluation.crossingsCount}
            </strong>
          </div>

          <div className="metric-pill">
            <span>Moves</span>
            <strong>
              {moveCount}
              <span style={{ fontSize: '11px', color: '#637180', fontWeight: 400 }}> / {level.parMoves}</span>
            </strong>
          </div>

          <div className="metric-pill">
            <span>Time</span>
            <strong style={{ fontSize: '16px' }}>
              {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
            </strong>
          </div>
        </div>
      </section>

      {/* Planar Knot Board */}
      <div
        ref={containerRef}
        className="board-container"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className="corner-crosshair corner-tl">+</span>
        <span className="corner-crosshair corner-tr">+</span>
        <span className="corner-crosshair corner-bl">+</span>
        <span className="corner-crosshair corner-br">+</span>

        <svg className="tangle-svg" viewBox="0 0 1000 1000">
          <defs>
            <radialGradient id="pin-gradient" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f5f7fa" />
              <stop offset="50%" stopColor="#c5d0dc" />
              <stop offset="100%" stopColor="#697787" />
            </radialGradient>
            <filter id={`knot-glow-${filterId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Victory concentric expanding ripple */}
          {showVictoryRipple && <circle cx={500} cy={500} className="victory-ripple" />}

          {/* Edges / Threads */}
          {level.edges.map((edge) => {
            const p1 = nodeMap.get(edge.source);
            const p2 = nodeMap.get(edge.target);
            if (!p1 || !p2) return null;

            const isTension = evaluation.edgeCrossingMap.has(edge.id);
            const lineClass = hasWon
              ? 'thread-line thread-solved'
              : isTension
              ? 'thread-line thread-tension'
              : 'thread-line thread-clear';

            return (
              <line
                key={edge.id}
                x1={p1.x * 1000}
                y1={p1.y * 1000}
                x2={p2.x * 1000}
                y2={p2.y * 1000}
                className={lineClass}
              />
            );
          })}

          {/* Intersection Points */}
          {!hasWon &&
            evaluation.crossingPoints.map((pt, idx) => (
              <g key={`cross-${idx}`} transform={`translate(${pt.x * 1000}, ${pt.y * 1000})`}>
                <circle r={4.5} className="crossing-marker" />
                <line x1={-3} y1={0} x2={3} y2={0} stroke="#ffffff" strokeWidth={1} strokeOpacity={0.8} />
                <line x1={0} y1={-3} x2={0} y2={3} stroke="#ffffff" strokeWidth={1} strokeOpacity={0.8} />
              </g>
            ))}

          {/* Sparks */}
          {sparks.map((spark) => (
            <circle
              key={spark.id}
              cx={spark.x + spark.vx}
              cy={spark.y + spark.vy}
              r={3}
              className="spark-particle"
            />
          ))}

          {/* Nodes (Brass / Titanium Drafting Pins) */}
          {nodes.map((node) => {
            const cx = node.x * 1000;
            const cy = node.y * 1000;
            const isDragging = draggingNodeId === node.id;
            const isSelected = selectedNodeId === node.id;
            const isHot = hotNodeId === node.id;

            return (
              <g
                key={node.id}
                className={`pin-node ${isDragging ? 'pin-dragging' : ''} ${isSelected ? 'pin-selected' : ''} ${isHot ? 'pin-tension-hot' : ''}`}
                onPointerDown={(e) => handlePointerDown(e, node.id)}
                tabIndex={0}
                role="button"
                aria-label={`Pin ${node.id}`}
                onKeyDown={(e) => handleKeyDown(e, node.id)}
              >
                {/* 32px invisible touch target for finger tap accessibility */}
                <circle cx={cx} cy={cy} r={32} className="pin-touch-target" />

                {/* Cast Shadow */}
                <ellipse
                  cx={cx + (isDragging ? 4 : 2)}
                  cy={cy + (isDragging ? 9 : 4)}
                  rx={15}
                  ry={10}
                  className="pin-cast-shadow"
                />

                {/* Milled Outer Bezel */}
                <circle cx={cx} cy={cy} r={14} className="pin-bezel" />

                {/* Metallic Top Cap */}
                <circle cx={cx} cy={cy} r={10.5} className="pin-cap" />

                {/* Core Rivet */}
                <circle cx={cx} cy={cy} r={3.5} className="pin-core-rivet" />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Controls Bar */}
      <div className="controls-bar">
        <button
          className="action-btn"
          onClick={handleUndo}
          disabled={undoStack.length === 0 || hasWon}
          title="Revert last move"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          <span>Undo ({undoStack.length})</span>
        </button>

        <button
          className={`action-btn ${showTensionHint ? 'active-hint' : ''}`}
          onClick={toggleTensionHint}
          disabled={hasWon || evaluation.crossingsCount === 0}
          title="Highlight the pin connecting the most crossings"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{showTensionHint ? 'Hide hint' : 'Tension hint'}</span>
        </button>

        <button className="action-btn" onClick={handleReset} title="Reset knot to initial state">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>Reset</span>
        </button>
      </div>

      {/* Result Card */}
      {hasWon && (
        <section className="result-card">
          <div className="result-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <span className="result-title">Knot untangled</span>
            </div>
            <span className="result-rating">
              {stars === 3 ? 'Optimal efficiency' : stars === 2 ? 'Par solution' : 'Solved'}
            </span>
          </div>

          <p>
            Solved in <strong>{moveCount} moves</strong> ({Math.floor(elapsedSeconds / 60)}m {elapsedSeconds % 60}s) with zero intersecting lines. Par target was {level.parMoves} moves.
            {userDailyRank !== undefined && (
              <span style={{ display: 'block', marginTop: '6px', color: '#94a3b8', fontSize: '12px' }}>
                Rank #{userDailyRank} on r/{(typeof context !== 'undefined' && context?.subredditName) ? context.subredditName : 'tangle_daily'} today
              </span>
            )}
            {flairAwarded && (
              <span style={{ display: 'block', marginTop: '4px', color: '#6ee7b7', fontSize: '12px' }}>
                Subreddit flair: <strong>{flairAwarded}</strong>
              </span>
            )}
          </p>

          <div className="result-actions">
            <button className="primary-btn" onClick={handleShare}>
              Share record to Reddit comments
            </button>

            <button className="secondary-link-btn" onClick={() => setShowLeaderboardModal(true)}>
              View Subreddit Leaderboard →
            </button>
          </div>
        </section>
      )}

      {/* How to play modal */}
      {showHelpModal && (
        <div className="modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <h2>How to play</h2>
              <button className="close-btn" onClick={() => setShowHelpModal(false)}>
                ✕
              </button>
            </div>
            <p>
              Tangle is a daily knot untangling puzzle grounded in planar graph theory.
            </p>
            <p>
              Every knot begins with intersecting threads. Drag the drafting pins across the board until{' '}
              <strong>zero lines cross</strong>.
            </p>
            <p>
              • <strong>Dashed amber threads</strong> indicate active crossings under tension.<br />
              • <strong>Solid silver threads</strong> are clear of intersections.<br />
              • <strong>Tension hint</strong> highlights the pin tied to the most crossings.<br />
              • Untangle within <strong>Par moves</strong> to earn 3 stars.<br />
              • Advance your rank from <em>Wanderer</em> to <em>Topology Grandmaster</em> by maintaining your daily streak!
            </p>
          </div>
        </div>
      )}

      {/* Subreddit Leaderboard Modal */}
      {showLeaderboardModal && (
        <div className="modal-backdrop" onClick={() => setShowLeaderboardModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <h2>Subreddit Leaderboard</h2>
              <button className="close-btn" onClick={() => setShowLeaderboardModal(false)}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px' }}>
              Daily Knot #{currentDay} · r/{(typeof context !== 'undefined' && context?.subredditName) ? context.subredditName : 'tangle_daily'}
            </p>

            {userDailyRank !== undefined && (
              <div className="user-leaderboard-banner">
                <span>Your Standing Today</span>
                <span>#{userDailyRank} Place</span>
              </div>
            )}

            {leaderboard.length === 0 ? (
              <div className="empty-leaderboard">
                No scores submitted yet today. Untangle the knot to claim 1st place!
              </div>
            ) : (
              <div className="leaderboard-list">
                {leaderboard.map((entry) => {
                  const rankClass = entry.rank === 1 ? 'rank-gold' : entry.rank === 2 ? 'rank-silver' : entry.rank === 3 ? 'rank-bronze' : 'rank-default';
                  return (
                    <div
                      key={entry.username}
                      className={`leaderboard-row ${entry.rank === userDailyRank ? 'highlight-user' : ''}`}
                    >
                      <div className="leaderboard-left">
                        <span className={`leaderboard-rank-num ${rankClass}`}>{entry.rank}</span>
                        {entry.avatarUrl ? (
                          <img src={entry.avatarUrl} alt="" className="snoo-avatar-mini" />
                        ) : (
                          <div className="snoo-avatar-fallback">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                        )}
                        <div className="leaderboard-name-box">
                          <span className="leaderboard-username">u/{entry.username}</span>
                          <span className="leaderboard-rank-title">{entry.rankTitle}</span>
                        </div>
                      </div>
                      <div className="leaderboard-right">
                        <span className="leaderboard-score">{entry.score.toLocaleString()} pts</span>
                        <span className="leaderboard-subtext">
                          {entry.moves} moves · {Math.floor(entry.timeSeconds / 60)}m {entry.timeSeconds % 60}s
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archive modal */}
      {showArchiveModal && (
        <div className="modal-backdrop" onClick={() => setShowArchiveModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <h2>Past knots</h2>
              <button className="close-btn" onClick={() => setShowArchiveModal(false)}>
                ✕
              </button>
            </div>
            <p>Practice past daily knots to refine your untangling strategy.</p>

            {Array.from({ length: 6 }, (_, i) => {
              const day = Math.max(1, todayDayNumber - i);
              const info = getTangleLevelForDay(day);
              const isCurrent = day === currentDay;

              return (
                <div
                  key={day}
                  className={`archive-item ${isCurrent ? 'active' : ''}`}
                  onClick={() => selectDay(day)}
                >
                  <span className="archive-name">
                    Knot #{day.toString().padStart(3, '0')} · {info.title}
                  </span>
                  <span className="archive-par">Par {info.parMoves}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats modal */}
      {showStatsModal && (
        <div className="modal-backdrop" onClick={() => setShowStatsModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title-row">
              <h2>Records & streaks</h2>
              <button className="close-btn" onClick={() => setShowStatsModal(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Snoovatar" className="snoo-avatar-med" />
              ) : (
                <div className="snoo-avatar-fallback" style={{ width: '34px', height: '34px' }}>👤</div>
              )}
              <div>
                <span className="user-rank-badge">{userRank}</span>
                <span style={{ display: 'block', fontSize: '11px', color: '#8a9ba8', marginTop: '2px' }}>
                  {currentStreak} Day Streak
                </span>
              </div>
            </div>

            {/* 7-Day Habit Tracker */}
            {weeklyHistory.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Weekly Habit Tracker
                </span>
                <div className="weekly-habit-strip" style={{ marginTop: '6px' }}>
                  {weeklyHistory.map((day) => (
                    <div
                      key={day.dayNumber}
                      className={`habit-cell ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''}`}
                    >
                      <span className="habit-day">{day.dayLabel}</span>
                      <div className="habit-dot">
                        {day.completed ? '✓' : day.isToday ? '•' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p>
              Current streak: <strong>{currentStreak} days</strong><br />
              Longest streak: <strong>{maxStreak} days</strong><br />
              Total solved: <strong>{totalUntangled} knots</strong>
            </p>
            <p style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
              The Reddit community has untangled <strong>{totalSolved.toLocaleString()} knots</strong> worldwide.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TangleApp />
  </StrictMode>
);
