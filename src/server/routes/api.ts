import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import {
  calculateDayNumber,
  getTangleLevelForDay,
  getUserRank,
  type DailyCommunityStats,
  type LeaderboardEntry,
  type SubmitTangleRequest,
  type SubmitTangleResponse,
  type TangleInitResponse,
  type UserStats,
  type WeeklyDayStatus,
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
  dailyRank: number | undefined,
  subreddit: string
): string {
  const stars = moves <= parMoves ? '⭐⭐⭐' : moves <= parMoves + 2 ? '⭐⭐' : '⭐';
  const paddedDay = dayNumber.toString().padStart(3, '0');
  const timeFormatted =
    timeSeconds !== undefined && timeSeconds > 0
      ? ` · ${Math.floor(timeSeconds / 60)}m ${(timeSeconds % 60).toString().padStart(2, '0')}s`
      : '';
  const rankLine = dailyRank !== undefined ? ` · Daily Rank: #${dailyRank}` : '';

  return [
    `TANGLE #${paddedDay} · Daily Knot ${stars}`,
    `Rank: ${rankTitle}${streak > 0 ? ` · Streak: ${streak} day${streak === 1 ? '' : 's'}` : ''}${rankLine}`,
    `Solved in ${moves} moves (Par: ${parMoves})${timeFormatted}`,
    `Crossings: ${initialCrossings} ➔ 0 · Score: ${score.toLocaleString()}`,
    '',
    `Untangle today on r/${subreddit}`,
  ].join('\n');
}

async function getDailyLeaderboard(dayNumber: number): Promise<LeaderboardEntry[]> {
  try {
    const key = `tangle:daily:${dayNumber}:leaderboard`;
    const range = await redis.zRange(key, 0, 9, { by: 'rank', reverse: true }).catch(() => []);
    if (!range || range.length === 0) return [];

    const entries: LeaderboardEntry[] = [];
    for (let i = 0; i < range.length; i++) {
      const item = range[i]!;
      const user = item.member;
      const score = item.score;
      const solverRaw = await redis.get(`tangle:daily:${dayNumber}:solver:${user}`).catch(() => null);
      let moves = 0;
      let timeSeconds = 0;
      let rankTitle = 'Wanderer';
      let avatarUrl: string | null = null;

      if (solverRaw) {
        try {
          const parsed = JSON.parse(solverRaw);
          moves = parsed.moves ?? 0;
          timeSeconds = parsed.timeSeconds ?? 0;
          rankTitle = parsed.rankTitle ?? 'Wanderer';
          avatarUrl = parsed.avatarUrl ?? null;
        } catch {
          // Ignore
        }
      }

      entries.push({
        username: user,
        rank: i + 1,
        score,
        moves,
        timeSeconds,
        rankTitle,
        avatarUrl,
      });
    }
    return entries;
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    return [];
  }
}

async function getWeeklyHistory(username: string, dayNumber: number): Promise<WeeklyDayStatus[]> {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const list: WeeklyDayStatus[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = Math.max(1, dayNumber - i);
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dayLabel = dayNames[date.getDay()] ?? '';

    let completed = false;
    let score: number | undefined;
    let moves: number | undefined;

    const recordRaw = await redis.get(`tangle:user:${username}:day:${d}`).catch(() => null);
    if (recordRaw) {
      try {
        const parsed = JSON.parse(recordRaw);
        completed = parsed.won === true;
        score = parsed.score;
        moves = parsed.moves;
      } catch {
        // Ignore
      }
    }

    list.push({
      dayNumber: d,
      dayLabel,
      isToday: i === 0,
      completed,
      score,
      moves,
    });
  }

  return list;
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

    // Fetch avatar URL from Reddit
    let avatarUrl: string | null = null;
    try {
      avatarUrl = (await reddit.getSnoovatarUrl(username)) ?? null;
    } catch {
      // Fallback
    }

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
      avatarUrl,
      currentStreak: 0,
      maxStreak: 0,
      totalSolved: 0,
      todayCompleted: false,
      rankTitle: getUserRank(0),
    };

    if (userStatsRaw) {
      try {
        userStats = { ...userStats, ...JSON.parse(userStatsRaw), avatarUrl };
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

    // Fetch weekly 7-day habit tracker
    const weeklyHistory = await getWeeklyHistory(username, dayNumber);
    userStats.weeklyHistory = weeklyHistory;

    // Fetch leaderboard & user rank
    const leaderboard = await getDailyLeaderboard(dayNumber);
    const key = `tangle:daily:${dayNumber}:leaderboard`;
    const rankLow = await redis.zRank(key, username).catch(() => undefined);
    const totalInLeaderboard = await redis.zCard(key).catch(() => 0);
    userStats.userDailyRank = rankLow !== undefined ? totalInLeaderboard - rankLow : undefined;

    return c.json<TangleInitResponse>({
      type: 'tangle_init',
      postId: postId ?? 'unknown',
      username,
      avatarUrl,
      dayNumber,
      dateString,
      level,
      communityStats,
      userStats,
      leaderboard,
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
    const subreddit = context.subredditName ?? 'tangle_daily';

    let avatarUrl: string | null = null;
    try {
      avatarUrl = (await reddit.getSnoovatarUrl(username)) ?? null;
    } catch {
      // Fallback
    }

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
      avatarUrl,
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
      avatarUrl,
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
      // Save solver details for leaderboard lookup
      redis.set(
        `tangle:daily:${dayNumber}:solver:${username}`,
        JSON.stringify({
          username,
          score,
          moves,
          timeSeconds,
          rankTitle,
          avatarUrl,
        })
      ).catch(() => null),
      // Add member to Redis Sorted Set
      won
        ? redis.zAdd(`tangle:daily:${dayNumber}:leaderboard`, { member: username, score }).catch(() => null)
        : Promise.resolve(),
    ]);

    const communityTotalRaw = await redis.get('tangle:global:solved').catch(() => '0');
    const updatedLeaderboard = await getDailyLeaderboard(dayNumber);

    const rankLow = await redis.zRank(`tangle:daily:${dayNumber}:leaderboard`, username).catch(() => undefined);
    const totalInSet = await redis.zCard(`tangle:daily:${dayNumber}:leaderboard`).catch(() => 1);
    const userDailyRank = rankLow !== undefined ? totalInSet - rankLow : 1;

    const shareText = generateTangleShareText(
      dayNumber,
      moves,
      parMoves,
      initialCrossings,
      score,
      newStreak,
      rankTitle,
      timeSeconds,
      userDailyRank,
      subreddit
    );

    // Award Subreddit User Flair
    let userFlairAwarded: string | null = null;
    if (won && username && username !== 'wanderer') {
      try {
        const flairText = `${rankTitle} • ${newStreak}d Streak`;
        await reddit.setUserFlair({
          subredditName: subreddit,
          username,
          text: flairText,
          textColor: 'light',
        });
        userFlairAwarded = flairText;
      } catch (flairErr) {
        console.warn('[Reddit Flair] Unable to set user flair:', flairErr);
      }
    }

    return c.json<SubmitTangleResponse>({
      type: 'tangle_submitted',
      success: true,
      dayNumber,
      newStreak,
      totalKnotsUntangled: communityTotalRaw ? parseInt(communityTotalRaw, 10) : 1,
      shareText,
      rankTitle,
      userDailyRank,
      userFlairAwarded,
      leaderboard: updatedLeaderboard,
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
