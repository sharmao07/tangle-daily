import test from 'node:test';
import assert from 'node:assert/strict';
import { combineColors, reflectMirror, simulateChamber } from './prism-engine.ts';
import { getChamberForDay, calculateDayNumber } from './prism-levels.ts';

test('combineColors correctly synthesizes secondary and tertiary light', () => {
  assert.equal(combineColors(['red', 'blue']), 'magenta');
  assert.equal(combineColors(['red', 'green']), 'yellow');
  assert.equal(combineColors(['green', 'blue']), 'cyan');
  assert.equal(combineColors(['red', 'green', 'blue']), 'white');
  assert.equal(combineColors(['red']), 'red');
  assert.equal(combineColors([]), undefined);
});

test('reflectMirror calculates 90-degree vector reflections', () => {
  // '/' forward
  assert.equal(reflectMirror('right', 'forward'), 'up');
  assert.equal(reflectMirror('down', 'forward'), 'left');
  assert.equal(reflectMirror('left', 'forward'), 'down');
  assert.equal(reflectMirror('up', 'forward'), 'right');

  // '\' backward
  assert.equal(reflectMirror('right', 'backward'), 'down');
  assert.equal(reflectMirror('up', 'backward'), 'left');
  assert.equal(reflectMirror('left', 'backward'), 'up');
  assert.equal(reflectMirror('down', 'backward'), 'right');
});

test('Day 1 Chamber can be solved by placing mirrors to synthesize Magenta', () => {
  const chamber = getChamberForDay(1);

  // Emitters:
  // e1: red at (-1, 0) pointing down
  // e2: blue at (4, -1) pointing right
  // Crystal at (2, 2) needs Magenta

  // Place mirror 1 at (2, 0) angle 'backward' (\: down -> right towards row 2)
  // Place mirror 2 at (4, 2) angle 'forward' (/: right -> up towards col 2)
  const pieces = [
    { id: 'p1', type: 'mirror' as const, angle: 'backward' as const, position: { row: 2, col: 0 } },
    { id: 'p2', type: 'mirror' as const, angle: 'forward' as const, position: { row: 4, col: 2 } },
  ];

  const result = simulateChamber(chamber.gridSize, chamber.emitters, pieces, chamber.walls, chamber.crystals);

  assert.equal(result.isSolved, true, 'Day 1 chamber should be solved with correct mirror placement');
  const crystal = result.crystals[0];
  assert.equal(crystal?.currentColor, 'magenta');
  assert.equal(crystal?.isSatisfied, true);
});

test('calculateDayNumber returns a valid calendar index', () => {
  const day = calculateDayNumber();
  assert.ok(day >= 1);
});
