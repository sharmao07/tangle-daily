export type Direction = 'up' | 'down' | 'left' | 'right';

export type Position = {
  row: number;
  col: number;
};

export type LightColor = 'red' | 'green' | 'blue' | 'yellow' | 'magenta' | 'cyan' | 'white';

export type MirrorAngle = 'forward' | 'backward'; // forward = / (45 deg), backward = \ (135 deg)

export type PieceType = 'mirror' | 'splitter' | 'wall';

export type OpticalPiece = {
  id: string;
  type: PieceType;
  angle?: MirrorAngle | undefined;
  position?: Position | undefined;
};

export type LaserEmitter = {
  id: string;
  row: number;
  col: number;
  direction: Direction;
  color: 'red' | 'green' | 'blue';
};

export type TargetCrystal = {
  id: string;
  row: number;
  col: number;
  targetColor: LightColor;
  currentColor?: LightColor | undefined;
  isSatisfied: boolean;
};

export type BeamSegment = {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  color: LightColor;
  direction: Direction;
};

export type PrismLevel = {
  dayNumber: number;
  title: string;
  subtitle: string;
  gridSize: number;
  emitters: LaserEmitter[];
  crystals: TargetCrystal[];
  walls: Position[];
  availablePieces: OpticalPiece[];
  parMoves: number;
};

export type DailyCommunityStats = {
  totalSolves: number;
  totalCrystalsAwakened: number;
  averageMoves: number;
};

export type UserStats = {
  username: string;
  currentStreak: number;
  maxStreak: number;
  totalChambersAwakened: number;
  todayCompleted: boolean;
  todayScore?: number | undefined;
  todayMoves?: number | undefined;
};

export type PrismInitResponse = {
  type: 'prism_init';
  postId: string;
  username: string;
  dayNumber: number;
  dateString: string;
  level: PrismLevel;
  communityStats: DailyCommunityStats;
  userStats: UserStats;
};

export type SubmitPrismRequest = {
  dayNumber: number;
  won: boolean;
  moves: number;
  parMoves: number;
  crystalsAwakened: number;
  score: number;
};

export type SubmitPrismResponse = {
  type: 'prism_submitted';
  success: boolean;
  dayNumber: number;
  newStreak: number;
  totalCrystalsAwakened: number;
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
