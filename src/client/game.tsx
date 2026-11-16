import './index.css';

import { context } from '@devvit/web/client';
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  calculateDayNumber,
  evaluateGraph,
  getTangleLevelForDay,
  type GraphNode,
  type SubmitTangleRequest,
  type SubmitTangleResponse,
  type TangleInitResponse,
  type TangleLevel,
} from '../shared/api';
import { tangleSounds } from './tangle-audio';

export function TangleApp() {
  const todayDayNumber = useMemo(() => calculateDayNumber(), []);
  const [currentDay, setCurrentDay] = useState<number>(todayDayNumber);
  const [level, setLevel] = useState<TangleLevel>(() => getTangleLevelForDay(todayDayNumber));

  // Graph nodes
  const [nodes, setNodes] = useState<GraphNode[]>(() => level.nodes.map((n) => ({ ...n })));
  const [undoStack, setUndoStack] = useState<GraphNode[][]>([]);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);

  // Active interaction
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const previousCrossingsRef = useRef<number>(level.initialCrossings);
  const hasWonRef = useRef<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Audio & Modals
  const [isMuted, setIsMuted] = useState<boolean>(() => tangleSounds.isMuted());
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showArchiveModal, setShowArchiveModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Community & user stats
  const [totalSolved, setTotalSolved] = useState<number>(3420);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalUntangled, setTotalUntangled] = useState<number>(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3200);
  }, []);

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/init');
        if (res.ok) {
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
          if (data.userStats) {
            setCurrentStreak(data.userStats.currentStreak);
            setMaxStreak(data.userStats.maxStreak);
            setTotalUntangled(data.userStats.totalSolved);
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
    setHasSubmitted(false);
    hasWonRef.current = false;
    previousCrossingsRef.current = newLvl.initialCrossings;
    setDraggingNodeId(null);
    setSelectedNodeId(null);
    setShowArchiveModal(false);
  }, []);

  // Graph evaluation
  const evaluation = useMemo(() => {
    return evaluateGraph(nodes, level.edges);
  }, [nodes, level.edges]);

  const hasWon = evaluation.crossingsCount === 0;

  // Submit score on untangle
  const submitSolution = useCallback(
    async (finalMoves: number) => {
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
      tangleSounds.playSolved();
      void submitSolution(moveCount);
    }
  }, [hasWon, moveCount, submitSolution]);

  // Pointer Drag & Drop Handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>, nodeId: string) => {
      if (hasWon) return;
      e.stopPropagation();

      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        dragStartPosRef.current = { x: node.x, y: node.y };
      }

      setDraggingNodeId(nodeId);
      setSelectedNodeId(nodeId);
      tangleSounds.playGrab();

      try {
        (e.target as Element).setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }
    },
    [hasWon, nodes]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingNodeId || hasWon || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left) / rect.width;
      const rawY = (e.clientY - rect.top) / rect.height;

      const clampedX = Math.max(0.1, Math.min(0.9, rawX));
      const clampedY = Math.max(0.1, Math.min(0.9, rawY));

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

      // Only count as a move if position changed meaningfully (> 2%)
      if (currentNode && startPos) {
        const dx = currentNode.x - startPos.x;
        const dy = currentNode.y - startPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.02) {
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
          }
          previousCrossingsRef.current = evaluation.crossingsCount;
        }
      }

      setDraggingNodeId(null);
      dragStartPosRef.current = null;
    },
    [draggingNodeId, evaluation.crossingsCount, nodes]
  );

  // Tap-to-move fallback for keyboard or non-drag pointers
  const handleBoardClick = useCallback(
    (e: React.MouseEvent) => {
      if (hasWon || !selectedNodeId || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left) / rect.width;
      const rawY = (e.clientY - rect.top) / rect.height;

      const clampedX = Math.max(0.1, Math.min(0.9, rawX));
      const clampedY = Math.max(0.1, Math.min(0.9, rawY));

      // Push current to undo
      setUndoStack((prev) => [...prev, nodes.map((n) => ({ ...n }))]);
      setNodes((prev) =>
        prev.map((n) => (n.id === selectedNodeId ? { ...n, x: clampedX, y: clampedY } : n))
      );
      setMoveCount((c) => c + 1);
      tangleSounds.playDrop();
      setSelectedNodeId(null);
    },
    [hasWon, nodes, selectedNodeId]
  );

  // Undo move
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || hasWon) return;
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;

    tangleSounds.playGrab();
    setNodes(previous);
    setUndoStack((prev) => prev.slice(0, -1));
  }, [hasWon, undoStack]);

  // Reset knot
  const handleReset = useCallback(() => {
    tangleSounds.playGrab();
    setNodes(level.nodes.map((n) => ({ ...n })));
    setUndoStack([]);
    setMoveCount(0);
    setHasSubmitted(false);
    hasWonRef.current = false;
    previousCrossingsRef.current = level.initialCrossings;
    setDraggingNodeId(null);
    setSelectedNodeId(null);
  }, [level]);

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
    const subreddit = context.subredditName ?? 'windward_daily_dev';

    const shareText = [
      `TANGLE #${paddedDay} · Daily Knot ${starText}`,
      `Solved in ${moveCount} moves (Par: ${level.parMoves})`,
      `Crossings: ${level.initialCrossings} ➔ 0`,
      `Score: ${score.toLocaleString()}${currentStreak > 0 ? ` · Streak: ${currentStreak} days` : ''}`,
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
  }, [stars, currentDay, moveCount, level.parMoves, level.initialCrossings, score, currentStreak, showToast]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    for (const n of nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [nodes]);

  return (
    <main className="tangle-app">
      {/* Toast */}
      {toastMessage && <div className="toast-box">{toastMessage}</div>}

      {/* Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" />
          <span className="brand-name">Tangle</span>
        </div>

        <div className="header-meta">
          <button
            className="icon-btn"
            onClick={toggleSound}
            aria-label="Toggle sound"
            title="Toggle sound"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button
            className="icon-btn"
            onClick={() => setShowHelpModal(true)}
            aria-label="How to play"
            title="How to play"
          >
            ?
          </button>

          <button
            className="icon-btn"
            onClick={() => setShowStatsModal(true)}
            aria-label="Records & streaks"
            title="Records & streaks"
          >
            ≡
          </button>

          <button
            className="icon-btn"
            onClick={() => setShowArchiveModal(true)}
            aria-label="Past knots"
            title="Past knots"
          >
            📅
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
        </div>
      </section>

      {/* Planar Knot Board */}
      <div
        ref={containerRef}
        className="board-container"
        onClick={handleBoardClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <svg className="tangle-svg" viewBox="0 0 1000 1000">
          {/* Edges / Threads */}
          {level.edges.map((edge) => {
            const p1 = nodeMap.get(edge.source);
            const p2 = nodeMap.get(edge.target);
            if (!p1 || !p2) return null;

            const isTension = evaluation.edgeCrossingMap.has(edge.id);

            return (
              <line
                key={edge.id}
                x1={p1.x * 1000}
                y1={p1.y * 1000}
                x2={p2.x * 1000}
                y2={p2.y * 1000}
                className={`thread-line ${isTension ? 'thread-tension' : 'thread-clear'}`}
              />
            );
          })}

          {/* Intersection Points */}
          {evaluation.crossingPoints.map((pt, idx) => (
            <circle
              key={`cross-${idx}`}
              cx={pt.x * 1000}
              cy={pt.y * 1000}
              r={4}
              className="crossing-indicator"
            />
          ))}

          {/* Nodes (Pins) */}
          {nodes.map((node) => {
            const cx = node.x * 1000;
            const cy = node.y * 1000;
            const isDragging = draggingNodeId === node.id;
            const isSelected = selectedNodeId === node.id;

            return (
              <g
                key={node.id}
                className={`pin-node ${isDragging || isSelected ? 'pin-active' : ''}`}
                onPointerDown={(e) => handlePointerDown(e, node.id)}
              >
                <circle cx={cx} cy={cy + 4} r={14} className="pin-shadow" />
                <circle cx={cx} cy={cy} r={13} className="pin-body" />
                <circle cx={cx} cy={cy} r={4} className="pin-core" />
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
        >
          <span>Undo ({undoStack.length})</span>
        </button>

        <button className="action-btn" onClick={handleReset}>
          <span>Reset knot</span>
        </button>
      </div>

      {/* Result Card */}
      {hasWon && (
        <section className="result-card">
          <div className="result-header">
            <span className="result-title">Knot untangled</span>
            <span className="result-stars">
              {stars === 3 ? '⭐⭐⭐' : stars === 2 ? '⭐⭐' : '⭐'}
            </span>
          </div>

          <p>
            Solved in {moveCount} moves with zero intersecting lines. Par target was {level.parMoves} moves.
          </p>

          <button className="primary-btn" onClick={handleShare}>
            Share record to Reddit comments
          </button>
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
              Tangle is a daily knot untangling puzzle based on planar graph theory.
            </p>
            <p>
              Every knot begins tangled with intersecting threads. Drag the brass pins across the board until{' '}
              <strong>no lines cross</strong>.
            </p>
            <p>
              • Dashed amber threads indicate active tension (crossing).<br />
              • Solid silver threads are clear.<br />
              • Beat the Par move target for 3 stars.
            </p>
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
            <p>
              Current streak: <strong>{currentStreak} days</strong><br />
              Longest streak: <strong>{maxStreak} days</strong><br />
              Total solved: <strong>{totalUntangled} knots</strong>
            </p>
            <p style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
              The Reddit community has untangled <strong>{totalSolved.toLocaleString()} knots</strong> today.
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
