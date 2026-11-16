import type { LaserEmitter, OpticalPiece, Position, PrismLevel, TargetCrystal } from './prism-types';

export function calculateDayNumber(date: Date = new Date()): number {
  const epoch = new Date('2026-11-01T00:00:00Z').getTime();
  const current = date.getTime();
  const diffDays = Math.floor((current - epoch) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

// Master curated chambers for initial days
const CURATED_CHAMBERS: Record<number, PrismLevel> = {
  1: {
    dayNumber: 1,
    title: 'The First Resonance',
    subtitle: 'Synthesize Violet light by crossing Red and Blue wavelengths.',
    gridSize: 5,
    emitters: [
      { id: 'e1', row: -1, col: 0, direction: 'down', color: 'red' },
      { id: 'e2', row: 4, col: -1, direction: 'right', color: 'blue' },
    ],
    crystals: [
      { id: 'c1', row: 2, col: 2, targetColor: 'magenta', isSatisfied: false },
    ],
    walls: [
      { row: 1, col: 1 },
    ],
    availablePieces: [
      { id: 'p1', type: 'mirror', angle: 'backward' }, // '\' sends down -> right
      { id: 'p2', type: 'mirror', angle: 'forward' },  // '/' sends right -> up
    ],
    parMoves: 2,
  },

  2: {
    dayNumber: 2,
    title: 'Dual Harmonization',
    subtitle: 'Route Green light to synthesize both Amber and Cyan.',
    gridSize: 5,
    emitters: [
      { id: 'e1', row: -1, col: 1, direction: 'down', color: 'red' },
      { id: 'e2', row: 2, col: -1, direction: 'right', color: 'green' },
      { id: 'e3', row: 5, col: 3, direction: 'up', color: 'blue' },
    ],
    crystals: [
      { id: 'c1', row: 2, col: 1, targetColor: 'yellow', isSatisfied: false },
      { id: 'c2', row: 2, col: 3, targetColor: 'cyan', isSatisfied: false },
    ],
    walls: [
      { row: 0, col: 3 },
      { row: 4, col: 1 },
    ],
    availablePieces: [
      { id: 'p1', type: 'mirror', angle: 'forward' },
      { id: 'p2', type: 'mirror', angle: 'backward' },
      { id: 'p3', type: 'mirror', angle: 'forward' },
    ],
    parMoves: 2,
  },

  3: {
    dayNumber: 3,
    title: 'The Obsidian Triangle',
    subtitle: 'Guide three distinct primary beams past obsidian barriers.',
    gridSize: 5,
    emitters: [
      { id: 'e1', row: -1, col: 2, direction: 'down', color: 'red' },
      { id: 'e2', row: 1, col: -1, direction: 'right', color: 'green' },
      { id: 'e3', row: 3, col: -1, direction: 'right', color: 'blue' },
    ],
    crystals: [
      { id: 'c1', row: 1, col: 2, targetColor: 'yellow', isSatisfied: false },
      { id: 'c2', row: 3, col: 2, targetColor: 'magenta', isSatisfied: false },
      { id: 'c3', row: 3, col: 4, targetColor: 'blue', isSatisfied: false },
    ],
    walls: [
      { row: 2, col: 2 },
      { row: 0, col: 4 },
    ],
    availablePieces: [
      { id: 'p1', type: 'mirror', angle: 'backward' },
      { id: 'p2', type: 'mirror', angle: 'forward' },
      { id: 'p3', type: 'mirror', angle: 'backward' },
    ],
    parMoves: 3,
  },

  4: {
    dayNumber: 4,
    title: 'The Pure White Core',
    subtitle: 'Converge Red, Green, and Blue onto the central monolith.',
    gridSize: 5,
    emitters: [
      { id: 'e1', row: -1, col: 2, direction: 'down', color: 'red' },
      { id: 'e2', row: 2, col: -1, direction: 'right', color: 'green' },
      { id: 'e3', row: 2, col: 5, direction: 'left', color: 'blue' },
    ],
    crystals: [
      { id: 'c1', row: 2, col: 2, targetColor: 'white', isSatisfied: false },
    ],
    walls: [
      { row: 1, col: 1 },
      { row: 1, col: 3 },
      { row: 3, col: 1 },
      { row: 3, col: 3 },
    ],
    availablePieces: [
      { id: 'p1', type: 'mirror', angle: 'forward' },
      { id: 'p2', type: 'mirror', angle: 'backward' },
    ],
    parMoves: 0, // Direct convergence
  },
};

export function getChamberForDay(dayNumber: number): PrismLevel {
  const curated = CURATED_CHAMBERS[dayNumber];
  if (curated) return curated;

  // Procedural chamber generator for day > 4:
  // Deterministic PRNG seeded by dayNumber
  let seed = Math.imul(dayNumber ^ 0x9e3779b9, 0x85ebca6b);
  const nextRng = () => {
    seed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b);
    seed ^= seed >>> 13;
    return ((seed >>> 0) / 4294967296);
  };

  const gridSize = 5;
  const titles = [
    'Spectrum Corridor',
    'Refractive Nexus',
    'Prismatic Gateway',
    'Crystalline Harmonic',
    'The Photon Vault',
    'Chroma Convergence',
  ];
  const title = titles[(dayNumber - 1) % titles.length] ?? `Chamber #${dayNumber}`;

  const emitters: LaserEmitter[] = [
    { id: 'e1', row: -1, col: 1, direction: 'down', color: 'red' },
    { id: 'e2', row: 2, col: -1, direction: 'right', color: 'blue' },
    { id: 'e3', row: 5, col: 3, direction: 'up', color: 'green' },
  ];

  const targetColors = ['magenta', 'yellow', 'cyan', 'white'] as const;
  const pickedColor = targetColors[dayNumber % targetColors.length]!;

  const crystals: TargetCrystal[] = [
    { id: 'c1', row: 2, col: 1, targetColor: pickedColor, isSatisfied: false },
  ];

  const walls: Position[] = [
    { row: 0, col: 3 },
    { row: 4, col: 2 },
  ];

  const availablePieces: OpticalPiece[] = [
    { id: 'p1', type: 'mirror', angle: nextRng() > 0.5 ? 'forward' : 'backward' },
    { id: 'p2', type: 'mirror', angle: nextRng() > 0.5 ? 'forward' : 'backward' },
    { id: 'p3', type: 'mirror', angle: nextRng() > 0.5 ? 'forward' : 'backward' },
  ];

  return {
    dayNumber,
    title,
    subtitle: `Synthesize ${pickedColor.toUpperCase()} light across the optical chamber.`,
    gridSize,
    emitters,
    crystals,
    walls,
    availablePieces,
    parMoves: 3,
  };
}
