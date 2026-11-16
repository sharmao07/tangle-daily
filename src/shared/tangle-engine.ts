import type { GraphEdge, GraphNode, IntersectionPoint, TangleLevel } from './tangle-types';

export function calculateDayNumber(date: Date = new Date()): number {
  const epoch = new Date('2026-11-01T00:00:00Z').getTime();
  const current = date.getTime();
  const diffDays = Math.floor((current - epoch) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

// Line intersection math
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
 * Generates an undeniably planar graph by embedding N vertices in a wheel / outer-cycle + non-crossing triangulation,
 * verifying 0 crossings in solved state, and then scrambling the vertex positions so the puzzle starts with crossings!
 */
export function generatePlanarKnot(dayNumber: number): TangleLevel {
  let seed = Math.imul(dayNumber ^ 0x6d2b79f5, 0x159a55e5);
  const rng = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    seed ^= seed + Math.imul(seed ^ (seed >>> 7), 61 | seed) ^ seed;
    return ((seed ^ (seed >>> 14)) >>> 0) / 4294967296;
  };

  const nodeCount = 6 + (dayNumber % 4); // 6, 7, 8, or 9 vertices
  const titles = [
    'The Hexagonal Loop',
    'The Star Polygon',
    'Crown of Seven',
    'The Octagon Spire',
    'The Radial Web',
    'The Prismatic Ring',
  ];
  const title = titles[(dayNumber - 1) % titles.length] ?? `Knot #${dayNumber}`;

  // 1. Compute a planar embedding (circle layout with center hub, or simple cycle + triangulation)
  // Outer ring of (nodeCount - 1) vertices + 1 center hub
  const ringCount = nodeCount - 1;
  const centerNode: GraphNode = { id: `n${nodeCount}`, x: 0.5, y: 0.5 };
  const planarNodes: GraphNode[] = [];

  for (let i = 0; i < ringCount; i++) {
    const angle = (2 * Math.PI * i) / ringCount;
    const r = 0.35;
    const x = 0.5 + r * Math.cos(angle);
    const y = 0.5 + r * Math.sin(angle);
    planarNodes.push({ id: `n${i + 1}`, x, y });
  }
  planarNodes.push(centerNode);

  // 2. Add edges:
  // - Outer ring cycle: n1-n2, n2-n3, ..., n_{k}-n1
  // - Center spokes: center connects to each ring node
  const edges: GraphEdge[] = [];
  for (let i = 0; i < ringCount; i++) {
    const next = (i + 1) % ringCount;
    edges.push({
      id: `e_ring_${i}`,
      source: `n${i + 1}`,
      target: `n${next + 1}`,
    });
  }
  for (let i = 0; i < ringCount; i++) {
    edges.push({
      id: `e_spoke_${i}`,
      source: centerNode.id,
      target: `n${i + 1}`,
    });
  }

  // 3. Verify that the planar embedding has strictly 0 crossings!
  const planarEval = evaluateGraph(planarNodes, edges);
  if (planarEval.crossingsCount !== 0) {
    console.error('Planar embedding warning: crossings found in generator base');
  }

  // 4. Scramble the node positions to create the puzzle!
  // Permute / shuffle the positions among the nodes
  const scrambledPositions: { x: number; y: number }[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * Math.PI * i) / nodeCount + (rng() * 0.4 - 0.2);
    const r = 0.2 + rng() * 0.25;
    scrambledPositions.push({
      x: 0.5 + r * Math.cos(angle),
      y: 0.5 + r * Math.sin(angle),
    });
  }

  // Shuffle positions array
  for (let i = scrambledPositions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = scrambledPositions[i]!;
    scrambledPositions[i] = scrambledPositions[j]!;
    scrambledPositions[j] = temp;
  }

  const puzzleNodes: GraphNode[] = planarNodes.map((n, idx) => ({
    id: n.id,
    x: Math.max(0.12, Math.min(0.88, scrambledPositions[idx]!.x)),
    y: Math.max(0.12, Math.min(0.88, scrambledPositions[idx]!.y)),
  }));

  const initialEval = evaluateGraph(puzzleNodes, edges);

  return {
    dayNumber,
    title,
    nodes: puzzleNodes,
    edges,
    initialCrossings: initialEval.crossingsCount,
    parMoves: Math.max(3, Math.ceil(nodeCount / 2)),
  };
}

export function getTangleLevelForDay(dayNumber: number): TangleLevel {
  return generatePlanarKnot(dayNumber);
}
