import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDailyLevel, calculateDayNumber, GRID_SIZE } from './generator.ts';

test('calculateDayNumber returns positive integer', () => {
  const day = calculateDayNumber();
  assert.ok(day >= 1, 'Day number should be at least 1');
});

test('generateDailyLevel generates valid boards for days 1 through 50', () => {
  for (let day = 1; day <= 50; day++) {
    const level = generateDailyLevel(day);

    assert.equal(level.gridSize, GRID_SIZE);
    assert.equal(level.board.length, GRID_SIZE);
    assert.equal(level.board[0]?.length, GRID_SIZE);

    assert.ok(level.maxGusts >= 8, `Day ${day} maxGusts should be at least 8`);
    assert.ok(level.parMoves >= 5, `Day ${day} parMoves should be at least 5`);

    // Verify start and nest exist on the board
    let hasStart = false;
    let hasNest = false;
    let checkpoints = 0;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = level.board[r]?.[c];
        if (tile?.kind === 'start') hasStart = true;
        if (tile?.kind === 'nest') hasNest = true;
        if (tile?.kind === 'checkpoint') checkpoints++;
      }
    }

    assert.ok(hasStart, `Day ${day} must have a start tile`);
    assert.ok(hasNest, `Day ${day} must have a nest tile`);
    assert.ok(checkpoints >= 1, `Day ${day} must have at least 1 checkpoint`);
  }
});
