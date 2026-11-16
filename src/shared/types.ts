export type Direction = 'up' | 'down' | 'left' | 'right';

export type Position = {
  row: number;
  col: number;
};

export type TileKind =
  | 'rock'
  | 'calm'
  | 'storm'
  | 'current'
  | 'checkpoint'
  | 'nest'
  | 'start';

export type Tile = {
  kind: TileKind;
  current?: Direction;
};

export type FlightLevel = {
  dayNumber: number;
  title: string;
  region: string;
  description: string;
  gridSize: number;
  maxGusts: number;
  startPosition: Position;
  board: Tile[][];
  parMoves: number;
};

export type DailyCommunityStats = {
  totalFlights: number;
  totalBirdsSaved: number;
  survivalRate: number;
};

export type UserStats = {
  username: string;
  currentStreak: number;
  maxStreak: number;
  totalFlights: number;
  totalBirdsSaved: number;
  todayCompleted: boolean;
  todayScore?: number;
  todayStars?: number;
};

export type DailyInfoResponse = {
  type: 'daily_info';
  postId: string;
  username: string;
  dayNumber: number;
  dateString: string;
  level: FlightLevel;
  communityStats: DailyCommunityStats;
  userStats: UserStats;
};

export type SubmitFlightRequest = {
  dayNumber: number;
  won: boolean;
  birdsSaved: number;
  gustsLeft: number;
  checkpoints: number;
  moves: number;
  score: number;
  path: Position[];
};

export type SubmitFlightResponse = {
  type: 'flight_submitted';
  success: boolean;
  dayNumber: number;
  newStreak: number;
  totalBirdsSaved: number;
  communityBirdsSaved: number;
  shareText: string;
};

// Backward-compatibility stubs
export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};
