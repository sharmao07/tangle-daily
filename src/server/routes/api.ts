import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import {
  calculateDayNumber,
  getChamberForDay,
  type DailyCommunityStats,
  type PrismInitResponse,
  type SubmitPrismRequest,
  type SubmitPrismResponse,
  type UserStats,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

function generatePrismShareText(
  dayNumber: number,
  won: boolean,
  moves: number,
  parMoves: number,
  score: number,
  streak: number,
  subreddit: string
): string {
  const stars = moves <= parMoves ? '⭐⭐⭐' : moves <= parMoves + 2 ? '⭐⭐' : '⭐';
  const paddedDay = dayNumber.toString().padStart(3, '0');

  return [
    `💎 PRISM #${paddedDay} ${won ? stars : '❌'}`,
    won ? `Awakened in ${moves} moves (Par: ${parMoves})` : `Chamber unresolved (${moves} moves)`,
    `Score: ${score.toLocaleString()}${streak > 0 ? ` · Streak: ${streak} 🔥` : ''}`,
    '',
    won ? '🔴 ➔ 🪞 ➔ 💎 (Awakened)' : '🔴 ➔ ⬛ ➔ ✖',
    '',
    `Solve today on r/${subreddit}!`,
  ].join('\n');
}

api.get('/init', async (c) => {
  const { postId } = context;

  try {
    const username = (await reddit.getCurrentUsername()) ?? 'optician';
    const dayNumber = calculateDayNumber();
    const dateString = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const level = getChamberForDay(dayNumber);

    // Fetch Redis community stats
    const [solvesRaw, crystalsRaw] = await Promise.all([
      redis.get(`prism:daily:${dayNumber}:solves`).catch(() => null),
      redis.get(`prism:daily:${dayNumber}:crystals`).catch(() => null),
    ]);

    const totalSolves = solvesRaw ? parseInt(solvesRaw, 10) : 0;
    const totalCrystalsAwakened = crystalsRaw ? parseInt(crystalsRaw, 10) : 0;
    const averageMoves = level.parMoves;

    const communityStats: DailyCommunityStats = {
      totalSolves,
      totalCrystalsAwakened,
      averageMoves,
    };

    // Fetch user stats
    const userStatsRaw = await redis.get(`prism:user:${username}:stats`).catch(() => null);
    let userStats: UserStats = {
      username,
      currentStreak: 0,
      maxStreak: 0,
      totalChambersAwakened: 0,
      todayCompleted: false,
    };

    if (userStatsRaw) {
      try {
        userStats = { ...userStats, ...JSON.parse(userStatsRaw) };
      } catch (e) {
        console.error('Error parsing user stats:', e);
      }
    }

    // Check if played today
    const todayRecord = await redis.get(`prism:user:${username}:day:${dayNumber}`).catch(() => null);
    if (todayRecord) {
      try {
        const parsed = JSON.parse(todayRecord);
        userStats.todayCompleted = true;
        userStats.todayScore = parsed.score;
        userStats.todayMoves = parsed.moves;
      } catch (e) {
        console.error('Error parsing today record:', e);
      }
    }

    return c.json<PrismInitResponse>({
      type: 'prism_init',
      postId: postId ?? 'unknown',
      username,
      dayNumber,
      dateString,
      level,
      communityStats,
      userStats,
    });
  } catch (error) {
    console.error('Prism API Init Error:', error);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to initialize chamber',
      },
      500
    );
  }
});

api.get('/chamber/:dayNumber', async (c) => {
  const dayParam = c.req.param('dayNumber');
  const dayNumber = parseInt(dayParam, 10);

  if (isNaN(dayNumber) || dayNumber < 1) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid day number' }, 400);
  }

  const level = getChamberForDay(dayNumber);
  return c.json({
    status: 'success',
    dayNumber,
    level,
  });
});

api.post('/complete', async (c) => {
  try {
    const body = await c.req.json<SubmitPrismRequest>();
    const username = (await reddit.getCurrentUsername()) ?? 'optician';
    const subreddit = context.subredditName ?? 'prism_daily';

    const { dayNumber, won, moves, parMoves, crystalsAwakened, score } = body;

    // Increment community totals
    await Promise.all([
      won ? redis.incrBy(`prism:daily:${dayNumber}:solves`, 1).catch(() => null) : Promise.resolve(),
      redis.incrBy(`prism:daily:${dayNumber}:crystals`, crystalsAwakened).catch(() => null),
      redis.incrBy('prism:global:total_crystals', crystalsAwakened).catch(() => null),
    ]);

    // Read current user stats
    const userStatsRaw = await redis.get(`prism:user:${username}:stats`).catch(() => null);
    let userStats: UserStats = {
      username,
      currentStreak: 0,
      maxStreak: 0,
      totalChambersAwakened: 0,
      todayCompleted: false,
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
    const totalChambersAwakened = (userStats.totalChambersAwakened || 0) + (won ? 1 : 0);

    const updatedUserStats: UserStats = {
      username,
      currentStreak: newStreak,
      maxStreak,
      totalChambersAwakened,
      todayCompleted: true,
      todayScore: score,
      todayMoves: moves,
    };

    await Promise.all([
      redis.set(`prism:user:${username}:stats`, JSON.stringify(updatedUserStats)).catch(() => null),
      redis.set(
        `prism:user:${username}:day:${dayNumber}`,
        JSON.stringify({
          dayNumber,
          won,
          moves,
          score,
          completedAt: new Date().toISOString(),
        })
      ).catch(() => null),
    ]);

    const communityTotalRaw = await redis.get('prism:global:total_crystals').catch(() => '0');

    const shareText = generatePrismShareText(
      dayNumber,
      won,
      moves,
      parMoves,
      score,
      newStreak,
      subreddit
    );

    return c.json<SubmitPrismResponse>({
      type: 'prism_submitted',
      success: true,
      dayNumber,
      newStreak,
      totalCrystalsAwakened: communityTotalRaw ? parseInt(communityTotalRaw, 10) : crystalsAwakened,
      shareText,
    });
  } catch (error) {
    console.error('Error submitting chamber solution:', error);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit solution',
      },
      500
    );
  }
});
