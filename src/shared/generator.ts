import type { Direction, FlightLevel, Position, Tile } from './types';

// Simple seeded PRNG (Mulberry32)
export function createRng(seed: number) {
  let s = Math.imul(seed ^ 0x6d2b79f5, 0x159a55e5);
  return function () {
    s = Math.imul(s ^ (s >>> 15), 1 | s);
    s ^= s + Math.imul(s ^ (s >>> 7), 61 | s) ^ s;
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

const REGION_NAMES = [
  'The Mistral Pass',
  'Zephyr Valley',
  'Sirocco Steppes',
  'Boreas Ridge',
  'Gale Archipelago',
  'Aura Plateau',
  'Vesper Basin',
  'Chinook Canyons',
  'Harmattan Expanse',
  'Anemoi Crossing',
  'Solano Straits',
  'Alize Divide',
];

const LEVEL_SUBTITLES = [
  'Follow the thermal drafts toward twilight.',
  'Navigate the mountain currents to reach the northern cliffs.',
  'Dodge the low-pressure storms through the narrow gap.',
  'Catch the prevailing westerlies past the stone needles.',
  'Guide your flock above the turbulent canyon winds.',
  'Ride the high-altitude stream into the peaceful valley.',
];

export const GRID_SIZE = 7;

export const DIRECTIONS: Record<
  Direction,
  { row: number; col: number; label: string; symbol: string }
> = {
  up: { row: -1, col: 0, label: 'North', symbol: '↑' },
  down: { row: 1, col: 0, label: 'South', symbol: '↓' },
  left: { row: 0, col: -1, label: 'West', symbol: '←' },
  right: { row: 0, col: 1, label: 'East', symbol: '→' },
};

export function isInsideBoard(pos: Position): boolean {
  return pos.row >= 0 && pos.row < GRID_SIZE && pos.col >= 0 && pos.col < GRID_SIZE;
}

export function positionKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

// Master handcrafted levels for initial days
const CURATED_LEVELS: Record<number, Partial<FlightLevel>> = {
  1: {
    title: 'The Narrow Pass',
    region: 'Zephyr Valley',
    description: 'Catch the easterly current to clear the mountain gap.',
    maxGusts: 10,
    parMoves: 7,
    startPosition: { row: 6, col: 3 },
  },
  2: {
    title: 'Whispering Ridge',
    region: 'Boreas Ridge',
    description: 'Stay clear of the western turbulence cells.',
    maxGusts: 11,
    parMoves: 8,
    startPosition: { row: 6, col: 1 },
  },
  3: {
    title: 'The Storm Corridor',
    region: 'Mistral Pass',
    description: 'Thread the needle between thunderheads.',
    maxGusts: 12,
    parMoves: 9,
    startPosition: { row: 6, col: 5 },
  },
};

/**
 * Generate a complete, solvable daily flight puzzle for any day number.
 */
export function generateDailyLevel(dayNumber: number): FlightLevel {
  const rng = createRng(dayNumber * 997 + 1337);

  // Pick title and region
  const regionIndex = (dayNumber - 1) % REGION_NAMES.length;
  const region = REGION_NAMES[regionIndex] ?? 'Windward Corridor';
  const subtitleIndex = (dayNumber - 1) % LEVEL_SUBTITLES.length;
  const description = LEVEL_SUBTITLES[subtitleIndex] ?? 'Guide them home.';
  const curated = CURATED_LEVELS[dayNumber];

  const title = curated?.title ?? `Flight #${dayNumber.toString().padStart(3, '0')}`;

  // Start & nest positions
  const startCol = curated?.startPosition?.col ?? (2 + Math.floor(rng() * 3));
  const startPosition: Position = { row: 6, col: startCol };

  const nestCol = 2 + Math.floor(rng() * 3);
  const nestPosition: Position = { row: 0, col: nestCol };

  // Initialize board with mountains (rocks)
  const board: Tile[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, (): Tile => ({ kind: 'rock' }))
  );

  const put = (r: number, c: number, tile: Tile) => {
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      board[r]![c] = tile;
    }
  };

  if (dayNumber === 1) {
    // Elegant, accessible Day 1 layout
    put(6, 3, { kind: 'start' });
    put(5, 3, { kind: 'current', current: 'right' });
    put(5, 4, { kind: 'calm' });
    put(4, 4, { kind: 'calm' });
    put(4, 3, { kind: 'current', current: 'up' });
    put(3, 3, { kind: 'calm' });
    put(3, 2, { kind: 'checkpoint' });
    put(2, 2, { kind: 'current', current: 'right' });
    put(2, 3, { kind: 'calm' });
    put(2, 4, { kind: 'checkpoint' });
    put(1, 4, { kind: 'current', current: 'up' });
    put(0, 4, { kind: 'nest' });

    // Storms
    put(6, 2, { kind: 'storm' });
    put(5, 5, { kind: 'storm' });
    put(4, 5, { kind: 'storm' });
    put(3, 4, { kind: 'storm' });
    put(2, 1, { kind: 'storm' });
    put(1, 5, { kind: 'storm' });
    put(3, 1, { kind: 'storm' });

    return {
      dayNumber: 1,
      title: 'The Narrow Pass',
      region: 'Zephyr Valley',
      description: 'Catch the easterly current to clear the mountain gap.',
      gridSize: GRID_SIZE,
      maxGusts: 10,
      startPosition: { row: 6, col: 3 },
      board,
      parMoves: 7,
    };
  }

  // Procedural corridor generation for day > 1:
  // Step 1: Carve a guaranteed calm navigable backbone from start to nest
  let curr = { ...startPosition };
  const corridorTiles = new Set<string>();
  corridorTiles.add(positionKey(curr));
  put(curr.row, curr.col, { kind: 'start' });

  while (curr.row > 0 || curr.col !== nestPosition.col) {
    const moves: Position[] = [];
    if (curr.row > 0) moves.push({ row: curr.row - 1, col: curr.col });
    if (curr.col < nestPosition.col) moves.push({ row: curr.row, col: curr.col + 1 });
    else if (curr.col > nestPosition.col) moves.push({ row: curr.row, col: curr.col - 1 });

    // Pick move weighted towards upward movement
    let next: Position;
    if (moves.length === 1) {
      next = moves[0]!;
    } else {
      next = rng() < 0.65 ? moves[0]! : moves[1]!;
    }

    curr = next;
    corridorTiles.add(positionKey(curr));
    put(curr.row, curr.col, { kind: 'calm' });
  }
  put(nestPosition.row, nestPosition.col, { kind: 'nest' });

  // Step 2: Carve secondary branches for checkpoints
  const checkpoints: Position[] = [];
  const candidateRows = [2, 4];
  for (const row of candidateRows) {
    const col = Math.floor(rng() * 5) + 1;
    // ensure not blocking start/nest
    if (row === 6) continue;
    if (positionKey({ row, col }) === positionKey(nestPosition)) continue;

    put(row, col, { kind: 'checkpoint' });
    checkpoints.push({ row, col });
    corridorTiles.add(positionKey({ row, col }));

    // carve connection to corridor
    const dir = col > 3 ? -1 : 1;
    let connectCol = col + dir;
    while (connectCol >= 1 && connectCol <= 5 && !corridorTiles.has(positionKey({ row, col: connectCol }))) {
      put(row, connectCol, { kind: 'calm' });
      corridorTiles.add(positionKey({ row, col: connectCol }));
      connectCol += dir;
    }
  }

  // Step 3: Add 3-5 wind currents that provide shortcuts
  for (let r = 1; r < GRID_SIZE - 1; r++) {
    for (let c = 1; c < GRID_SIZE - 1; c++) {
      const key = positionKey({ row: r, col: c });
      if (corridorTiles.has(key) && board[r]?.[c]?.kind === 'calm' && rng() < 0.28) {
        // Choose direction that moves generally toward nest or checkpoint
        const preferredDir: Direction = r > 1 && rng() < 0.6 ? 'up' : (c <= 3 ? 'right' : 'left');
        put(r, c, { kind: 'current', current: preferredDir });
      }
    }
  }

  // Step 4: Open up some surrounding airspace to allow route alternatives
  for (let r = 1; r < GRID_SIZE - 1; r++) {
    for (let c = 1; c < GRID_SIZE - 1; c++) {
      const key = positionKey({ row: r, col: c });
      if (!corridorTiles.has(key) && rng() < 0.4) {
        put(r, c, { kind: 'calm' });
      }
    }
  }

  // Step 5: Place 5-7 storm cells in strategic flanking positions
  let stormsPlaced = 0;
  for (let r = 1; r < GRID_SIZE - 1; r++) {
    for (let c = 1; c < GRID_SIZE - 1; c++) {
      const tile = board[r]?.[c];
      if (tile?.kind === 'calm' && !corridorTiles.has(positionKey({ row: r, col: c }))) {
        if (rng() < 0.45 && stormsPlaced < 7) {
          put(r, c, { kind: 'storm' });
          stormsPlaced++;
        }
      }
    }
  }

  // Ensure start & nest stay intact
  put(startPosition.row, startPosition.col, { kind: 'start' });
  put(nestPosition.row, nestPosition.col, { kind: 'nest' });

  // Calculate estimated par moves
  const parMoves = Math.max(7, Math.abs(startPosition.row - nestPosition.row) + Math.abs(startPosition.col - nestPosition.col) + 2);
  const maxGusts = parMoves + 3;

  return {
    dayNumber,
    title,
    region,
    description,
    gridSize: GRID_SIZE,
    maxGusts,
    startPosition,
    board,
    parMoves,
  };
}

export function calculateDayNumber(date: Date = new Date()): number {
  // Epoch anchored on Nov 1, 2026
  const epoch = new Date('2026-11-01T00:00:00Z').getTime();
  const current = date.getTime();
  const diffDays = Math.floor((current - epoch) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}
