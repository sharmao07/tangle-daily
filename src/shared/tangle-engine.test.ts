import test from 'node:test';
import assert from 'node:assert/strict';
import { linesIntersect, getTangleLevelForDay, calculateDayNumber } from './tangle-engine.ts';

test('linesIntersect detects true line crossings', () => {
  // Cross: X pattern
  assert.equal(
    linesIntersect({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }),
    true
  );

  // Parallel lines
  assert.equal(
    linesIntersect({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }),
    false
  );

  // Sharing an endpoint
  assert.equal(
    linesIntersect({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 0 }),
    false
  );
});

test('generatePlanarKnot creates valid knots with crossings for days 1 through 10', () => {
  for (let day = 1; day <= 10; day++) {
    const level = getTangleLevelForDay(day);
    assert.ok(level.nodes.length >= 6, `Day ${day} should have at least 6 nodes`);
    assert.ok(level.edges.length >= 8, `Day ${day} should have at least 8 edges`);
    assert.ok(level.initialCrossings > 0, `Day ${day} should start scrambled with crossings`);

    // Verify coordinates are within [0.1, 0.9]
    for (const node of level.nodes) {
      assert.ok(node.x >= 0.1 && node.x <= 0.9);
      assert.ok(node.y >= 0.1 && node.y <= 0.9);
    }
  }
});

test('calculateDayNumber returns a valid positive integer', () => {
  const day = calculateDayNumber();
  assert.ok(day >= 1);
});
