import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import {
  calculateDayNumber,
  generateDailyLevel,
  type DailyCommunityStats,
  type DailyInfoResponse,
  type SubmitFlightRequest,
  type SubmitFlightResponse,
  type UserStats,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

// Helper to generate spoiler-free flight grid for Reddit comments
function generateShareText(
  dayNumber: number,
  won: boolean,
  birdsSaved: number,
  gustsLeft: number,
  checkpoints: number,
  score: number,
  moves: number,
  subreddit: string
): string {
  const stars = won ? (birdsSaved === 5 && checkpoints === 2 ? '⭐⭐⭐' : birdsSaved >= 4 ? '⭐⭐' : '⭐') : '❌';
  const paddedDay = dayNumber.toString().padStart(3, '0');
  const flockText = won ? `${birdsSaved}/5 flock saved` : `0/5 flock lost in storm`;
  const gustText = `${gustsLeft} gusts left (${moves} moves)`;
  const checkText = `${checkpoints}/2 waypoints`;

  return [
    `🕊️ WINDWARD #${paddedDay} ${stars}`,
    `${flockText} · ${checkText}`,
    `${gustText} · Score: ${score.toLocaleString()}`,
    '',
    won ? '🟩 ↗ 🟩 ✧ 🟩 ⌂' : '🟩 ϟ 🟥 ── ✖',
    '',
    `Fly today on r/${subreddit}!`,
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

    const level = generateDailyLevel(dayNumber);

    // Fetch daily community stats from Redis
    const [flightsRaw, birdsRaw, winsRaw] = await Promise.all([
      redis.get(`daily:${dayNumber}:flights`).catch(() => null),
      redis.get(`daily:${dayNumber}:birds`).catch(() => null),
      redis.get(`daily:${dayNumber}:wins`).catch(() => null),
    ]);

    const totalFlights = flightsRaw ? parseInt(flightsRaw, 10) : 0;
    const totalBirdsSaved = birdsRaw ? parseInt(birdsRaw, 10) : 0;
    const totalWins = winsRaw ? parseInt(winsRaw, 10) : 0;
    const survivalRate = totalFlights > 0 ? Math.round((totalWins / totalFlights) * 100) : 100;

    const communityStats: DailyCommunityStats = {
      totalFlights,
      totalBirdsSaved,
      survivalRate,
    };

    // Fetch user stats
    const userStatsRaw = await redis.get(`user:${username}:stats`).catch(() => null);
    let userStats: UserStats = {
      username,
      currentStreak: 0,
      maxStreak: 0,
      totalFlights: 0,
      totalBirdsSaved: 0,
      todayCompleted: false,
    };

    if (userStatsRaw) {
      try {
        const parsed = JSON.parse(userStatsRaw);
        userStats = { ...userStats, ...parsed };
      } catch (e) {
        console.error('Failed to parse user stats:', e);
      }
    }

    // Check if user played today
    const userTodayKey = `user:${username}:day:${dayNumber}`;
    const userTodayRaw = await redis.get(userTodayKey).catch(() => null);
    if (userTodayRaw) {
      try {
        const todayData = JSON.parse(userTodayRaw);
        userStats.todayCompleted = true;
        userStats.todayScore = todayData.score;
        userStats.todayStars = todayData.stars;
      } catch (e) {
        console.error('Failed to parse today data:', e);
      }
    }

    return c.json<DailyInfoResponse>({
      type: 'daily_info',
      postId: postId ?? 'unknown',
      username,
      dayNumber,
      dateString,
      level,
      communityStats,
      userStats,
    });
  } catch (error) {
    console.error('API Init Error:', error);
    let errorMessage = 'Failed to load Windward daily flight';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return c.json<ErrorResponse>({ status: 'error', message: errorMessage }, 500);
  }
});

api.get('/level/:dayNumber', async (c) => {
  const dayParam = c.req.param('dayNumber');
  const dayNumber = parseInt(dayParam, 10);

  if (isNaN(dayNumber) || dayNumber < 1) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid day number' }, 400);
  }

  const level = generateDailyLevel(dayNumber);

  // Community stats for that day
  const [flightsRaw, birdsRaw, winsRaw] = await Promise.all([
    redis.get(`daily:${dayNumber}:flights`).catch(() => null),
    redis.get(`daily:${dayNumber}:birds`).catch(() => null),
    redis.get(`daily:${dayNumber}:wins`).catch(() => null),
  ]);

  const totalFlights = flightsRaw ? parseInt(flightsRaw, 10) : 0;
  const totalBirdsSaved = birdsRaw ? parseInt(birdsRaw, 10) : 0;
  const totalWins = winsRaw ? parseInt(winsRaw, 10) : 0;
  const survivalRate = totalFlights > 0 ? Math.round((totalWins / totalFlights) * 100) : 100;

  return c.json({
    status: 'success',
    dayNumber,
    level,
    communityStats: {
      totalFlights,
      totalBirdsSaved,
      survivalRate,
    },
  });
});

api.post('/complete', async (c) => {
  try {
    const body = await c.req.json<SubmitFlightRequest>();
    const username = (await reddit.getCurrentUsername()) ?? 'wanderer';
    const subreddit = context.subredditName ?? 'windward_daily';

    const { dayNumber, won, birdsSaved, gustsLeft, checkpoints, moves, score } = body;

    // Update community totals in Redis
    await Promise.all([
      redis.incrBy(`daily:${dayNumber}:flights`, 1).catch(() => null),
      redis.incrBy(`daily:${dayNumber}:birds`, Math.max(0, birdsSaved)).catch(() => null),
      won ? redis.incrBy(`daily:${dayNumber}:wins`, 1).catch(() => null) : Promise.resolve(),
      redis.incrBy('global:total_flights', 1).catch(() => null),
      redis.incrBy('global:total_birds_saved', Math.max(0, birdsSaved)).catch(() => null),
    ]);

    // Read current user stats
    const userStatsRaw = await redis.get(`user:${username}:stats`).catch(() => null);
    let userStats: UserStats = {
      username,
      currentStreak: 0,
      maxStreak: 0,
      totalFlights: 0,
      totalBirdsSaved: 0,
      todayCompleted: false,
    };

    if (userStatsRaw) {
      try {
        userStats = { ...userStats, ...JSON.parse(userStatsRaw) };
      } catch (e) {
        console.error('Error parsing userStats:', e);
      }
    }

    // Update streak logic
    let newStreak = userStats.currentStreak;
    if (won) {
      newStreak = (userStats.currentStreak || 0) + 1;
    }
    const maxStreak = Math.max(userStats.maxStreak || 0, newStreak);
    const totalFlights = (userStats.totalFlights || 0) + 1;
    const totalBirdsSaved = (userStats.totalBirdsSaved || 0) + Math.max(0, birdsSaved);

    const updatedUserStats: UserStats = {
      username,
      currentStreak: newStreak,
      maxStreak,
      totalFlights,
      totalBirdsSaved,
      todayCompleted: true,
      todayScore: score,
      todayStars: won ? (birdsSaved === 5 && checkpoints === 2 ? 3 : birdsSaved >= 4 ? 2 : 1) : 0,
    };

    // Save updated user stats and today's flight record
    await Promise.all([
      redis.set(`user:${username}:stats`, JSON.stringify(updatedUserStats)).catch(() => null),
      redis.set(
        `user:${username}:day:${dayNumber}`,
        JSON.stringify({
          dayNumber,
          won,
          birdsSaved,
          score,
          stars: updatedUserStats.todayStars,
          completedAt: new Date().toISOString(),
        })
      ).catch(() => null),
    ]);

    const communityBirdsTotal = await redis.get(`daily:${dayNumber}:birds`).catch(() => '0');

    const shareText = generateShareText(
      dayNumber,
      won,
      birdsSaved,
      gustsLeft,
      checkpoints,
      score,
      moves,
      subreddit
    );

    return c.json<SubmitFlightResponse>({
      type: 'flight_submitted',
      success: true,
      dayNumber,
      newStreak,
      totalBirdsSaved,
      communityBirdsSaved: communityBirdsTotal ? parseInt(communityBirdsTotal, 10) : birdsSaved,
      shareText,
    });
  } catch (error) {
    console.error('Error submitting flight:', error);
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit flight',
      },
      500
    );
  }
});
