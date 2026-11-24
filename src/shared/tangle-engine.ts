import type { GraphEdge, GraphNode, IntersectionPoint, TangleLevel } from './tangle-types';

export function calculateDayNumber(date: Date = new Date()): number {
  const epoch = new Date('2026-11-01T00:00:00Z').getTime();
  const current = date.getTime();
  const diffDays = Math.floor((current - epoch) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Returns day-of-week index (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * Epoch 2026-11-01 was Sunday (dayNumber 1 = Sunday).
 */
export function getDayOfWeek(dayNumber: number): number {
  return ((dayNumber - 1) % 7 + 7) % 7;
}

export type WeeklyDifficultyTier = 'Gentle Monday' | 'Taper Tuesday' | 'Midweek Focus' | 'Technical Thursday' | 'Friday Crucible' | 'Weekend Masterwork';

export function getDifficultyTier(dayNumber: number): WeeklyDifficultyTier {
  const dow = getDayOfWeek(dayNumber);
  switch (dow) {
    case 1:
      return 'Gentle Monday';
    case 2:
      return 'Taper Tuesday';
    case 3:
      return 'Midweek Focus';
    case 4:
      return 'Technical Thursday';
    case 5:
      return 'Friday Crucible';
    case 6:
    case 0:
    default:
      return 'Weekend Masterwork';
  }
}

// Line intersection math using 2D cross products
function ccw(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

export function linesIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  const eps = 1e-5;
  const samePoint = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;

  if (samePoint(p1, p3) || samePoint(p1, p4) || samePoint(p2, p3) || samePoint(p2, p4)) {
    return false;
  }

  const cp1 = ccw(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  const cp2 = ccw(p1.x, p1.y, p2.x, p2.y, p4.x, p4.y);
  const cp3 = ccw(p3.x, p3.y, p4.x, p4.y, p1.x, p1.y);
  const cp4 = ccw(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y);

  return ((cp1 > 0 && cp2 < 0) || (cp1 < 0 && cp2 > 0)) &&
         ((cp3 > 0 && cp4 < 0) || (cp3 < 0 && cp4 > 0));
}

export function findIntersectionPoint(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): { x: number; y: number } | null {
  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(denom) < 1e-6) return null;

  const t1 = p1.x * p2.y - p1.y * p2.x;
  const t2 = p3.x * p4.y - p3.y * p4.x;

  const x = (t1 * (p3.x - p4.x) - (p1.x - p2.x) * t2) / denom;
  const y = (t1 * (p3.y - p4.y) - (p1.y - p2.y) * t2) / denom;

  return { x, y };
}

export function evaluateGraph(
  nodes: GraphNode[],
  edges: GraphEdge[]
): {
  crossingsCount: number;
  crossingPoints: IntersectionPoint[];
  edgeCrossingMap: Set<string>;
} {
  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const crossingPoints: IntersectionPoint[] = [];
  const edgeCrossingMap = new Set<string>();

  for (let i = 0; i < edges.length; i++) {
    const e1 = edges[i]!;
    const p1 = nodeMap.get(e1.source);
    const p2 = nodeMap.get(e1.target);
    if (!p1 || !p2) continue;

    for (let j = i + 1; j < edges.length; j++) {
      const e2 = edges[j]!;
      const p3 = nodeMap.get(e2.source);
      const p4 = nodeMap.get(e2.target);
      if (!p3 || !p4) continue;

      if (linesIntersect(p1, p2, p3, p4)) {
        edgeCrossingMap.add(e1.id);
        edgeCrossingMap.add(e2.id);

        const pt = findIntersectionPoint(p1, p2, p3, p4);
        if (pt) {
          crossingPoints.push({
            x: pt.x,
            y: pt.y,
            edge1Id: e1.id,
            edge2Id: e2.id,
          });
        }
      }
    }
  }

  return {
    crossingsCount: crossingPoints.length,
    crossingPoints,
    edgeCrossingMap,
  };
}

/**
 * Procedural Planar Graph Generator:
 * Generates an undeniably planar graph across three distinct topological archetypes:
 * 1. Radial Wheel (W_n)
 * 2. Prismatic Concentric Cylinder (Y_n)
 * 3. Faceted Convex Polygon (Triangulated Gem)
 *
 * Each archetype is embedded with 0 crossings in its canonical state, verified,
 * and scrambled with a deterministic Mulberry32 PRNG seed.
 */
export function generatePlanarKnot(dayNumber: number): TangleLevel {
  let seed = Math.imul(dayNumber ^ 0x6d2b79f5, 0x159a55e5);
  const rng = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed) ^ seed;
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };

  const archetypeIndex = (dayNumber - 1) % 3;
  const dow = getDayOfWeek(dayNumber);
  let title: string;
  let archetype: string;
  const planarNodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  if (archetypeIndex === 0) {
    // Wheel Graph: Outer ring + center hub
    archetype = 'Radial Wheel';
    // Calibrated difficulty: Mon/Tue: 5 ring nodes; Wed/Thu: 6-7 ring nodes; Fri/Weekend: 7-8 ring nodes
    let ringCount = 5;
    if (dow === 3 || dow === 4) {
      ringCount = 6 + (dayNumber % 2); // 6 or 7
    } else if (dow === 5) {
      ringCount = 7;
    } else if (dow === 6 || dow === 0) {
      ringCount = 8;
    }

    const titles = [
      'The Hexagonal Hub',
      'The Septagon Wheel',
      'The Octagon Spire',
      'The Enneagon Nexus',
    ];
    const titleIdx = Math.max(0, Math.min(titles.length - 1, ringCount - 5));
    title = titles[titleIdx] ?? `Radial Knot #${dayNumber}`;

    const centerNode: GraphNode = { id: `n${ringCount + 1}`, x: 0.5, y: 0.5 };
    for (let i = 0; i < ringCount; i++) {
      const angle = (2 * Math.PI * i) / ringCount;
      const r = 0.36;
      planarNodes.push({
        id: `n${i + 1}`,
        x: 0.5 + r * Math.cos(angle),
        y: 0.5 + r * Math.sin(angle),
      });
    }
    planarNodes.push(centerNode);

    // Rim edges
    for (let i = 0; i < ringCount; i++) {
      const next = (i + 1) % ringCount;
      edges.push({ id: `e_rim_${i}`, source: `n${i + 1}`, target: `n${next + 1}` });
    }
    // Hub spokes
    for (let i = 0; i < ringCount; i++) {
      edges.push({ id: `e_spoke_${i}`, source: centerNode.id, target: `n${i + 1}` });
    }
  } else if (archetypeIndex === 1) {
    // Concentric Prism Ladder: Outer ring + concentric inner ring + non-crossing rungs
    archetype = 'Prismatic Cage';
    // Calibrated difficulty: Mon/Tue: k=3 (6 nodes); Wed/Thu: k=4 (8 nodes); Fri/Weekend: k=4 or 5 (8-10 nodes)
    let k = 4;
    if (dow === 1 || dow === 2) {
      k = 3;
    } else if (dow === 6 || dow === 0) {
      k = 5;
    }

    const titles = [
      'The Triangular Vault',
      'The Dual Orbit',
      'The Obsidian Gate',
      'The Pentagonal Cage',
    ];
    const titleIdx = k === 3 ? 0 : k === 4 ? 1 + (dayNumber % 2) : 3;
    title = titles[titleIdx] ?? `Prism Knot #${dayNumber}`;

    const rOuter = 0.38;
    const rInner = 0.18;
    for (let i = 0; i < k; i++) {
      const angle = (2 * Math.PI * i) / k;
      planarNodes.push({
        id: `n_out_${i + 1}`,
        x: 0.5 + rOuter * Math.cos(angle),
        y: 0.5 + rOuter * Math.sin(angle),
      });
      planarNodes.push({
        id: `n_in_${i + 1}`,
        x: 0.5 + rInner * Math.cos(angle),
        y: 0.5 + rInner * Math.sin(angle),
      });
    }

    // Outer cycle
    for (let i = 0; i < k; i++) {
      const next = (i + 1) % k;
      edges.push({ id: `e_out_${i}`, source: `n_out_${i + 1}`, target: `n_out_${next + 1}` });
    }
    // Inner cycle
    for (let i = 0; i < k; i++) {
      const next = (i + 1) % k;
      edges.push({ id: `e_in_${i}`, source: `n_in_${i + 1}`, target: `n_in_${next + 1}` });
    }
    // Radial rungs
    for (let i = 0; i < k; i++) {
      edges.push({ id: `e_rung_${i}`, source: `n_out_${i + 1}`, target: `n_in_${i + 1}` });
    }
  } else {
    // Triangulated Convex Polygon: Outer cycle + non-crossing fan chords
    archetype = 'Faceted Gem';
    // Calibrated difficulty: Mon/Tue: n=6 (6 nodes); Wed/Thu: n=7 (7 nodes); Fri/Weekend: n=8 or 9 (8-9 nodes)
    let n = 7;
    if (dow === 1 || dow === 2) {
      n = 6;
    } else if (dow === 5) {
      n = 8;
    } else if (dow === 6 || dow === 0) {
      n = 9;
    }

    const titles = [
      'Crown of Six',
      'The Celestial Kite',
      'The Faceted Diamond',
      'The Crystalline Fold',
    ];
    const titleIdx = n === 6 ? 0 : n === 7 ? 1 : n === 8 ? 2 : 3;
    title = titles[titleIdx] ?? `Facet Knot #${dayNumber}`;

    const r = 0.36;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / n;
      planarNodes.push({
        id: `n${i + 1}`,
        x: 0.5 + r * Math.cos(angle),
        y: 0.5 + r * Math.sin(angle),
      });
    }

    // Perimeter cycle
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      edges.push({ id: `e_cycle_${i}`, source: `n${i + 1}`, target: `n${next + 1}` });
    }

    // Internal non-crossing chords from vertex 0 to vertices 2, 3, 4, ... n-2
    for (let i = 2; i <= n - 2; i++) {
      edges.push({ id: `e_chord_${i}`, source: 'n1', target: `n${i + 1}` });
    }
  }

  // Double check canonical planarity
  const baseEval = evaluateGraph(planarNodes, edges);
  if (baseEval.crossingsCount !== 0) {
    console.error('Planar embedding warning: canonical base had crossings');
  }

  // Scramble node positions
  const nodeCount = planarNodes.length;
  const scrambledPositions: { x: number; y: number }[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * Math.PI * i) / nodeCount + (rng() * 0.4 - 0.2);
    const r = 0.2 + rng() * 0.22;
    scrambledPositions.push({
      x: 0.5 + r * Math.cos(angle),
      y: 0.5 + r * Math.sin(angle),
    });
  }

  // Fisher-Yates shuffle with seeded PRNG
  for (let i = scrambledPositions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = scrambledPositions[i]!;
    scrambledPositions[i] = scrambledPositions[j]!;
    scrambledPositions[j] = temp;
  }

  let puzzleNodes: GraphNode[] = planarNodes.map((n, idx) => ({
    id: n.id,
    x: Math.max(0.12, Math.min(0.88, scrambledPositions[idx]!.x)),
    y: Math.max(0.12, Math.min(0.88, scrambledPositions[idx]!.y)),
  }));

  let initialEval = evaluateGraph(puzzleNodes, edges);

  // If by rare chance it started untangled, swap two nodes to ensure a challenge
  if (initialEval.crossingsCount === 0 && puzzleNodes.length >= 2) {
    const n0 = puzzleNodes[0]!;
    const n1 = puzzleNodes[1]!;
    puzzleNodes = puzzleNodes.map((pn, i) => {
      if (i === 0) return { ...pn, x: n1.x, y: n1.y };
      if (i === 1) return { ...pn, x: n0.x, y: n0.y };
      return pn;
    });
    initialEval = evaluateGraph(puzzleNodes, edges);
  }

  return {
    dayNumber,
    title,
    archetype,
    nodes: puzzleNodes,
    edges,
    initialCrossings: initialEval.crossingsCount,
    parMoves: Math.max(3, Math.ceil(edges.length / 3)),
    solutionNodes: planarNodes.map((n) => ({ ...n })),
  };
}

export function getTangleLevelForDay(dayNumber: number): TangleLevel {
  return generatePlanarKnot(dayNumber);
}
