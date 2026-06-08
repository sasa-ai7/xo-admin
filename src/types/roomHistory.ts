export interface RoomHistoryPlayer {
  uid: string;
  displayName?: string;
  email?: string;
  side?: string;
  result?: 'win' | 'loss' | 'draw';
  coinsEarned?: number;
}

export interface RoomHistory {
  id: string;
  roomCode?: string;
  players?: RoomHistoryPlayer[];
  playerUids?: string[];
  winner?: string | null;
  result?: string;
  gameMode?: string;
  entryFee?: number;
  duration?: number;
  board?: (string | null)[];
  createdAt?: unknown;
  endedAt?: unknown;
  startedAt?: unknown;
  status?: string;
}
