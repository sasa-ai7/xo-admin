// Client-side room archiving is best-effort. For guaranteed archiving even
// when the admin dashboard is closed, move this logic to a trusted Cloud
// Function triggered on RTDB onUpdate for /rooms/{code} when status becomes
// finished | abandoned | expired | cancelled.

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import { TERMINAL_ROOM_STATUSES, type ArenaRoom } from '../types/room';

const ARCHIVE_VERSION = 1;

const archiveFields = [
  'roomCode',
  'status',
  'hostUid',
  'hostName',
  'hostPhoto',
  'hostPhotoURL',
  'guestUid',
  'guestName',
  'guestPhoto',
  'guestPhotoURL',
  'boardSize',
  'board',
  'roundsCount',
  'rounds',
  'currentRound',
  'currentRoundIndex',
  'score',
  'xUid',
  'oUid',
  'turnUid',
  'roundWinnerUid',
  'winnerUid',
  'loserUid',
  'roomWinnerUid',
  'result',
  'finalResult',
  'createdAt',
  'startedAt',
  'finishedAt',
  'updatedAt',
  'expiresAt',
  'cancelledAt',
  'cancelledByUid',
  'leftAt',
  'leftByUid',
  'matchId',
  'betEnabled',
  'playWithCoins',
  'betAmount',
  'prizePool',
  'potAmount',
  'coinsLocked',
  'payoutApplied',
  'prizePaid',
  'betLocks',
  'bets',
  'moves',
  'players',
  'winnerLine',
  'roundWinners',
  'lastMove',
] as const;

function stripUndefined<T extends Record<string, unknown>>(input: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

function buildSnapshot(room: ArenaRoom): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const field of archiveFields) {
    snapshot[field] = (room as unknown as Record<string, unknown>)[field];
  }
  snapshot.archivedAt = serverTimestamp();
  snapshot.source = 'realtime_database';
  snapshot.archiveVersion = ARCHIVE_VERSION;
  return stripUndefined(snapshot);
}

/**
 * Idempotently archive a room snapshot to Firestore if its status is terminal
 * (finished | abandoned | expired | cancelled). Writes are skipped silently if:
 *   - the room hasn't reached a terminal status
 *   - an archive doc already exists for the same id
 *   - the write fails (errors are logged in dev only)
 */
export async function archiveRoomIfTerminal(room: ArenaRoom): Promise<'skipped' | 'archived' | 'error'> {
  const status = room.status;
  if (!status || !TERMINAL_ROOM_STATUSES.has(status)) {
    return 'skipped';
  }
  const docId = (room.matchId && String(room.matchId).trim()) || room.roomCode;
  if (!docId) return 'skipped';

  const ref = doc(db, COLLECTIONS.roomArchives, docId);
  try {
    const existing = await getDoc(ref);
    if (existing.exists()) {
      return 'skipped';
    }
    const snapshot = buildSnapshot(room);
    await setDoc(ref, snapshot, { merge: false });
    if (import.meta.env.DEV) {
      console.info(`[RoomArchives] archived ${docId} (status=${status})`);
    }
    return 'archived';
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn(`[RoomArchives] best-effort archive failed for ${docId}:`, err);
    }
    return 'error';
  }
}
