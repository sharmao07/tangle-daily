import type {
  BeamSegment,
  Direction,
  LaserEmitter,
  LightColor,
  MirrorAngle,
  OpticalPiece,
  Position,
  TargetCrystal,
} from './prism-types';

export const DIRECTIONS_OFFSET: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

export function positionKey(pos: Position): string {
  return `${pos.row},${pos.col}`;
}

export function combineColors(colors: LightColor[]): LightColor | undefined {
  if (colors.length === 0) return undefined;
  let hasRed = false;
  let hasGreen = false;
  let hasBlue = false;

  for (const c of colors) {
    if (c === 'red') hasRed = true;
    else if (c === 'green') hasGreen = true;
    else if (c === 'blue') hasBlue = true;
    else if (c === 'yellow') {
      hasRed = true;
      hasGreen = true;
    } else if (c === 'magenta') {
      hasRed = true;
      hasBlue = true;
    } else if (c === 'cyan') {
      hasGreen = true;
      hasBlue = true;
    } else if (c === 'white') {
      hasRed = true;
      hasGreen = true;
      hasBlue = true;
    }
  }

  if (hasRed && hasGreen && hasBlue) return 'white';
  if (hasRed && hasGreen) return 'yellow';
  if (hasRed && hasBlue) return 'magenta';
  if (hasGreen && hasBlue) return 'cyan';
  if (hasRed) return 'red';
  if (hasGreen) return 'green';
  if (hasBlue) return 'blue';
  return undefined;
}

export function reflectMirror(dir: Direction, angle: MirrorAngle): Direction {
  if (angle === 'forward') {
    // '/' forward slash
    switch (dir) {
      case 'right':
        return 'up';
      case 'up':
        return 'right';
      case 'left':
        return 'down';
      case 'down':
        return 'left';
    }
  } else {
    // '\' backward slash
    switch (dir) {
      case 'right':
        return 'down';
      case 'down':
        return 'right';
      case 'left':
        return 'up';
      case 'up':
        return 'left';
    }
  }
}

export type SimulationResult = {
  beams: BeamSegment[];
  crystals: TargetCrystal[];
  isSolved: boolean;
};

export function simulateChamber(
  gridSize: number,
  emitters: LaserEmitter[],
  pieces: OpticalPiece[],
  walls: Position[],
  crystals: TargetCrystal[]
): SimulationResult {
  // Map pieces by position
  const pieceMap = new Map<string, OpticalPiece>();
  for (const p of pieces) {
    if (p.position) {
      pieceMap.set(positionKey(p.position), p);
    }
  }

  // Wall set
  const wallSet = new Set<string>();
  for (const w of walls) {
    wallSet.add(positionKey(w));
  }

  // Crystal tracking map
  const crystalColorMap = new Map<string, LightColor[]>();
  for (const c of crystals) {
    crystalColorMap.set(c.id, []);
  }

  const beams: BeamSegment[] = [];

  for (const emitter of emitters) {
    let currR = emitter.row;
    let currC = emitter.col;
    let currDir = emitter.direction;
    const color = emitter.color;

    let steps = 0;
    const maxSteps = gridSize * gridSize * 2;
    const visited = new Set<string>();

    while (steps < maxSteps) {
      steps++;
      const { dr, dc } = DIRECTIONS_OFFSET[currDir];
      const nextR = currR + dr;
      const nextC = currC + dc;

      // Check boundary
      if (nextR < 0 || nextR >= gridSize || nextC < 0 || nextC >= gridSize) {
        // Record beam leaving grid
        beams.push({
          fromRow: currR,
          fromCol: currC,
          toRow: nextR,
          toCol: nextC,
          color,
          direction: currDir,
        });
        break;
      }

      const nextKey = `${nextR},${nextC}`;
      const stateKey = `${nextKey}:${currDir}`;
      if (visited.has(stateKey)) {
        // Infinite loop detection
        break;
      }
      visited.add(stateKey);

      // Hit wall?
      if (wallSet.has(nextKey)) {
        beams.push({
          fromRow: currR,
          fromCol: currC,
          toRow: nextR,
          toCol: nextC,
          color,
          direction: currDir,
        });
        break;
      }

      // Record beam to this cell
      beams.push({
        fromRow: currR,
        fromCol: currC,
        toRow: nextR,
        toCol: nextC,
        color,
        direction: currDir,
      });

      // Check if crystal in this cell
      for (const crystal of crystals) {
        if (crystal.row === nextR && crystal.col === nextC) {
          const colors = crystalColorMap.get(crystal.id) ?? [];
          colors.push(color);
          crystalColorMap.set(crystal.id, colors);
        }
      }

      // Check if optical piece in this cell
      const piece = pieceMap.get(nextKey);
      if (piece && piece.type === 'mirror' && piece.angle) {
        currDir = reflectMirror(currDir, piece.angle);
      }

      currR = nextR;
      currC = nextC;
    }
  }

  // Evaluate crystals
  let allSatisfied = true;
  const updatedCrystals = crystals.map((c) => {
    const colorsReceived = crystalColorMap.get(c.id) ?? [];
    const combined = combineColors(colorsReceived);
    const isSatisfied = combined === c.targetColor;
    if (!isSatisfied) {
      allSatisfied = false;
    }
    return {
      ...c,
      currentColor: combined,
      isSatisfied,
    };
  });

  return {
    beams,
    crystals: updatedCrystals,
    isSolved: allSatisfied,
  };
}
