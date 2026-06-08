export type RoomStatus =
  | 'waiting'
  | 'ready'
  | 'countdown'
  | 'playing'
  | 'round_end'
  | 'finished'
  | 'abandoned'
  | 'expired'
  | 'cancelled';

export const TERMINAL_ROOM_STATUSES: ReadonlySet<RoomStatus> = new Set<RoomStatus>([
  'finished',
  'abandoned',
  'expired',
  'cancelled',
]);

export const ACTIVE_ROOM_STATUSES: ReadonlySet<RoomStatus> = new Set<RoomStatus>([
  'ready',
  'countdown',
  'playing',
  'round_end',
]);

export interface RoomPlayerEntry {
  uid?: string;
  displayName?: string;
  name?: string;
  email?: string;
  photoURL?: string;
  photo?: string;
  side?: 'X' | 'O';
  connected?: boolean;
  joinedAt?: number;
}

export interface RoomLastMove {
  uid?: string;
  cell?: number;
  symbol?: 'X' | 'O';
  at?: number;
}

export interface ArenaRoom {
  /** RTDB key (6-digit code) or Firestore archive doc id. */
  roomCode: string;
  hostUid?: string;
  hostName?: string;
  hostPhoto?: string;
  hostPhotoURL?: string;
  guestUid?: string;
  guestName?: string;
  guestPhoto?: string;
  guestPhotoURL?: string;
  status?: RoomStatus;
  boardSize?: number; // 3 | 4 | 5
  board?: Array<string | null>;
  roundsCount?: number;
  rounds?: unknown[];
  currentRound?: number;
  currentRoundIndex?: number;
  score?: Record<string, number>;
  xUid?: string;
  oUid?: string;
  turnUid?: string;
  roundWinnerUid?: string;
  winnerUid?: string;
  loserUid?: string;
  roomWinnerUid?: string;
  result?: string;
  finalResult?: string;
  createdAt?: number;
  updatedAt?: number;
  startedAt?: number;
  expiresAt?: number;
  finishedAt?: number;
  matchId?: string;
  cancelledByUid?: string;
  cancelledAt?: number;
  leftByUid?: string;
  leftAt?: number;
  betEnabled?: boolean;
  /** Alias for betEnabled used in online_room_history docs. */
  bettingEnabled?: boolean;
  playWithCoins?: boolean;
  betAmount?: number;
  prizePool?: number;
  potAmount?: number;
  coinsWon?: number;
  coinsLocked?: boolean;
  payoutApplied?: boolean;
  prizePaid?: boolean;
  betLocks?: Record<string, unknown>;
  bets?: Record<string, unknown>;
  moves?: unknown;
  players?: Record<string, RoomPlayerEntry>;
  winnerLine?: number[];
  roundWinners?: unknown[];
  lastMove?: RoomLastMove | unknown;
  /** Alias for roundsCount used in online_room_history docs. */
  roundCount?: number;
  /** Per-round board snapshots, archived as a parallel-to-board fallback. */
  roundMaps?: unknown[];
  /** Reason code from finished rooms (e.g. 'opponent_left'). */
  resultReason?: string;
  /** Archive-only metadata, set when read from Firestore room_archives. */
  archivedAt?: unknown;
  source?: string;
  archiveVersion?: number;
  // Derived in useArenaRooms / useArchivedRooms:
  playerCount?: number;
  movesCount?: number;
  hasGuest?: boolean;
  isTerminal?: boolean;
  isActive?: boolean;
  isArchived?: boolean;
}

/** Count moves whether it's an RTDB array, an RTDB list-of-objects, or absent. */
export function countMoves(moves: unknown): number {
  if (moves == null) return 0;
  if (Array.isArray(moves)) return moves.length;
  if (typeof moves === 'object') return Object.keys(moves as Record<string, unknown>).length;
  return 0;
}

export function countPlayers(room: Pick<ArenaRoom, 'players' | 'hostUid' | 'guestUid'>): number {
  if (room.players && typeof room.players === 'object') {
    const keys = Object.keys(room.players);
    if (keys.length > 0) return keys.length;
  }
  let n = 0;
  if (room.hostUid) n += 1;
  if (room.guestUid) n += 1;
  return n;
}
