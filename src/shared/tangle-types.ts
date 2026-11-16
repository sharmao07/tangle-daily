export type GraphNode = {
  id: string;
  x: number; // 0 to 1 normalized coordinate
  y: number; // 0 to 1 normalized coordinate
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type IntersectionPoint = {
  x: number;
  y: number;
  edge1Id: string;
  edge2Id: string;
};

export type TangleLevel = {
  dayNumber: number;
  title: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  initialCrossings: number;
  parMoves: number;
};

export type DailyCommunityStats = {
  totalSolved: number;
  averageMoves: number;
};

export type UserStats = {
  username: string;
  currentStreak: number;
  maxStreak: number;
  totalSolved: number;
  todayCompleted: boolean;
  todayScore?: number | undefined;
  todayMoves?: number | undefined;
};

export type TangleInitResponse = {
  type: 'tangle_init';
  postId: string;
  username: string;
  dayNumber: number;
  dateString: string;
  level: TangleLevel;
  communityStats: DailyCommunityStats;
  userStats: UserStats;
};

export type SubmitTangleRequest = {
  dayNumber: number;
  won: boolean;
  moves: number;
  parMoves: number;
  initialCrossings: number;
  score: number;
};

export type SubmitTangleResponse = {
  type: 'tangle_submitted';
  success: boolean;
  dayNumber: number;
  newStreak: number;
  totalKnotsUntangled: number;
  shareText: string;
};

// Backward compatibility stubs for starter template hooks
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
