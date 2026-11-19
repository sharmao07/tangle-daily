import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import {
  calculateDayNumber,
  getTangleLevelForDay,
  getUserRank,
  type DailyCommunityStats,
  type SubmitTangleRequest,
  type SubmitTangleResponse,
  type TangleInitResponse,
  type UserStats,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

function generateTangleShareText(
  dayNumber: number,
  moves: number,
  parMoves: number,
  initialCrossings: number,
  score: number,
  streak: number,
  rankTitle: string,
  timeSeconds: number | undefined,
  subreddit: string
): string {
  const stars = moves <= parMoves ? '⭐⭐⭐' : moves <= parMoves + 2 ? '⭐⭐' : '⭐';
  const paddedDay = dayNumber.toString().padStart(3, '0');
  const timeFormatted =
    timeSeconds !== undefined && timeSeconds > 0
      ? ` · ${Math.floor(timeSeconds / 60)}m ${(timeSeconds % 60).toString().padStart(2, '0')}s`
      : '';

  return [
    `TANGLE #${paddedDay} · Daily Knot ${stars}`,
    `Rank: ${rankTitle}${streak > 0 ? ` · Streak: ${streak} day${streak === 1 ? '' : 's'}` : ''}`,
    `Solved in ${moves} moves (Par: ${parMoves})${timeFormatted}`,
    `Crossings: ${initialCrossings} ➔ 0 · Score: ${score.toLocaleString()}`,
    '',
    `Untangle today on r/${subreddit}`,
  ].join('\n');
}

api.get('/init', async (c) => {
  const { postId } = context;

  try {
    const username = (await reddit.getCurrentUsername()) ?? 'wanderer';
    const dayNumber = calculateDayNumber();
    const dateString = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const level = getTangleLevelForDay(dayNumber);

    // Fetch Redis community stats
    const solvesRaw = await redis.get(`tangle:daily:${dayNumber}:solved`).catch(() => null);
    const totalSolved = solvesRaw ? parseInt(solvesRaw, 10) : 0;
    const averageMoves = level.parMoves;

    const communityStats: DailyCommunityStats = {
      totalSolved,
      averageMoves,
    };

    // Fetch user stats
    const userStatsRaw = await redis.get(`tangle:user:${username}:stats`).catch(() => null);
    let userStats: UserStats = {
      username,
      currentStreak: 0,
      maxStreak: 0,
      totalSolved: 0,
      todayCompleted: false,
      rankTitle: getUserRank(0),
    };

    if (userStatsRaw) {
      try {
        userStats = { ...userStats, ...JSON.parse(userStatsRaw) };
      } catch (e) {
        console.error('Error parsing user stats:', e);
      }
    }
    userStats.rankTitle = getUserRank(userStats.currentStreak);

    // Check if played today
    const todayRecord = await redis.get(`tangle:user:${username}:day:${dayNumber}`).catch(() => null);
    if (todayRecord) {
      try {
        const parsed = JSON.parse(todayRecord);
        userStats.todayCompleted = true;
        userStats.todayScore = parsed.score;
        userStats.todayMoves = parsed.moves;
        userStats.todayTimeSeconds = parsed.timeSeconds;
      } catch (e) {
        console.error('Error parsing today record:', e);
      }
    }

    return c.json<TangleInitResponse>({
      type: 'tangle_init',
      postId: postId ?? 'unknown',
      username,
      dayNumber,
      dateString,
      level,
      communityStats,
      userStats,
    });
  } catch (error) {
    console.error('Tangle API Init Error:', error);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to initialize knot',
      },
      500
    );
  }
});

api.get('/knot/:dayNumber', async (c) => {
  const dayParam = c.req.param('dayNumber');
  const dayNumber = parseInt(dayParam, 10);

  if (isNaN(dayNumber) || dayNumber < 1) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid day number' }, 400);
  }

  const level = getTangleLevelForDay(dayNumber);
  return c.json({
    status: 'success',
    dayNumber,
    level,
  });
});

api.post('/complete', async (c) => {
  try {
    const body = await c.req.json<SubmitTangleRequest>();
    const username = (await reddit.getCurrentUsername()) ?? 'wanderer';
    const subreddit = context.subredditName ?? 'windward_daily_dev';

    const { dayNumber, won, moves, parMoves, initialCrossings, score, timeSeconds } = body;

    // Increment community totals
    await Promise.all([
      won ? redis.incrBy(`tangle:daily:${dayNumber}:solved`, 1).catch(() => null) : Promise.resolve(),
      redis.incrBy('tangle:global:solved', 1).catch(() => null),
    ]);

    // Read current user stats
    const userStatsRaw = await redis.get(`tangle:user:${username}:stats`).catch(() => null);
    let userStats: UserStats = {
      username,
      currentStreak: 0,
      maxStreak: 0,
      totalSolved: 0,
      todayCompleted: false,
      rankTitle: getUserRank(0),
    };

    if (userStatsRaw) {
      try {
        userStats = { ...userStats, ...JSON.parse(userStatsRaw) };
      } catch (e) {
        console.error('Error parsing userStats:', e);
      }
    }

    let newStreak = userStats.currentStreak;
    if (won) {
      newStreak = (userStats.currentStreak || 0) + 1;
    }
    const maxStreak = Math.max(userStats.maxStreak || 0, newStreak);
    const totalSolved = (userStats.totalSolved || 0) + (won ? 1 : 0);
    const rankTitle = getUserRank(newStreak);

    const updatedUserStats: UserStats = {
      username,
      currentStreak: newStreak,
      maxStreak,
      totalSolved,
      todayCompleted: true,
      todayScore: score,
      todayMoves: moves,
      todayTimeSeconds: timeSeconds,
      rankTitle,
    };

    await Promise.all([
      redis.set(`tangle:user:${username}:stats`, JSON.stringify(updatedUserStats)).catch(() => null),
      redis.set(
        `tangle:user:${username}:day:${dayNumber}`,
        JSON.stringify({
          dayNumber,
          won,
          moves,
          score,
          timeSeconds,
          completedAt: new Date().toISOString(),
        })
      ).catch(() => null),
    ]);

    const communityTotalRaw = await redis.get('tangle:global:solved').catch(() => '0');

    const shareText = generateTangleShareText(
      dayNumber,
      moves,
      parMoves,
      initialCrossings,
      score,
      newStreak,
      rankTitle,
      timeSeconds,
      subreddit
    );

    return c.json<SubmitTangleResponse>({
      type: 'tangle_submitted',
      success: true,
      dayNumber,
      newStreak,
      totalKnotsUntangled: communityTotalRaw ? parseInt(communityTotalRaw, 10) : 1,
      shareText,
      rankTitle,
    });
  } catch (error) {
    console.error('Error submitting knot solve:', error);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit knot solve',
      },
      500
    );
  }
});
