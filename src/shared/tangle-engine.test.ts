import test from 'node:test';
import assert from 'node:assert/strict';
import {
  linesIntersect,
  getTangleLevelForDay,
  calculateDayNumber,
  getDayOfWeek,
  getDifficultyTier,
} from './tangle-engine.ts';
import { getUserRank } from './tangle-types.ts';

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

test('generatePlanarKnot creates valid knots with crossings across all topological archetypes', () => {
  const archetypesSeen = new Set<string>();

  for (let day = 1; day <= 28; day++) {
    const level = getTangleLevelForDay(day);
    archetypesSeen.add(level.archetype);

    assert.ok(level.nodes.length >= 6, `Day ${day} should have at least 6 nodes`);
    assert.ok(level.edges.length >= 8, `Day ${day} should have at least 8 edges`);
    assert.ok(level.initialCrossings > 0, `Day ${day} should start scrambled with crossings`);
    assert.ok(level.parMoves >= 3, `Day ${day} par moves should be at least 3`);

    // Verify coordinates are within [0.1, 0.9]
    for (const node of level.nodes) {
      assert.ok(node.x >= 0.1 && node.x <= 0.9);
      assert.ok(node.y >= 0.1 && node.y <= 0.9);
    }
  }

  // Ensure all 3 archetypes were exercised
  assert.ok(archetypesSeen.has('Radial Wheel'), 'Radial Wheel should be generated');
  assert.ok(archetypesSeen.has('Prismatic Cage'), 'Prismatic Cage should be generated');
  assert.ok(archetypesSeen.has('Faceted Gem'), 'Faceted Gem should be generated');
});

test('calibrated weekly difficulty provides structured progression across days', () => {
  // Day 2 is Monday (2026-11-02), Day 3 is Tuesday
  assert.equal(getDayOfWeek(2), 1);
  assert.equal(getDifficultyTier(2), 'Gentle Monday');
  assert.equal(getDayOfWeek(3), 2);
  assert.equal(getDifficultyTier(3), 'Taper Tuesday');

  // Day 6 is Friday, Day 7 is Saturday, Day 8 is Sunday
  assert.equal(getDayOfWeek(6), 5);
  assert.equal(getDifficultyTier(6), 'Friday Crucible');
  assert.equal(getDayOfWeek(7), 6);
  assert.equal(getDifficultyTier(7), 'Weekend Masterwork');
  assert.equal(getDayOfWeek(8), 0);
  assert.equal(getDifficultyTier(8), 'Weekend Masterwork');

  // Compare Monday knot vs Weekend knot
  const mondayKnot = getTangleLevelForDay(2); // Monday
  const weekendKnot = getTangleLevelForDay(7); // Saturday
  assert.ok(mondayKnot.nodes.length <= weekendKnot.nodes.length);
});

test('calculateDayNumber returns a valid positive integer', () => {
  const day = calculateDayNumber();
  assert.ok(day >= 1);
});

test('getUserRank assigns progressive topological ranks', () => {
  assert.equal(getUserRank(0), 'Wanderer');
  assert.equal(getUserRank(1), 'Knot Apprentice');
  assert.equal(getUserRank(3), 'Thread Weaver');
  assert.equal(getUserRank(7), 'Planar Scholar');
  assert.equal(getUserRank(14), 'Topology Grandmaster');
});
