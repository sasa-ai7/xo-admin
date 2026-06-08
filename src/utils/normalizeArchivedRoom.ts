import type { ArenaRoom, RoomStatus } from '../types/room';

/**
 * Map a Firestore `online_room_history` doc onto the ArenaRoom shape used by the
 * live RTDB rooms hook. The game writes finished-room snapshots with slightly
 * different field names (bettingEnabled, roundCount, potAmount, resultReason);
 * this normalizer aliases them so RoomCard / RoomDetailsDrawer / RoomTimeline
 * can read a single field set regardless of source.
 *
 * Only fields that exist on the raw doc are forwarded; missing fields stay
 * undefined so the rest of the UI keeps its existing "absent" rendering paths.
 */
export function normalizeArchivedRoom(
  raw: Record<string, unknown>,
  docId: string,
): ArenaRoom {
  const pick = <T,>(...keys: string[]): T | undefined => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null) return v as T;
    }
    return undefined;
  };

  const roundsRaw = pick<number | unknown[]>('roundsCount', 'roundCount', 'rounds');
  const roundsCount =
    typeof roundsRaw === 'number'
      ? roundsRaw
      : Array.isArray(roundsRaw)
        ? roundsRaw.length
        : undefined;

  const betEnabled = Boolean(pick<boolean>('betEnabled', 'bettingEnabled') ?? false);
  const status = pick<RoomStatus>('status') ?? 'finished';

  return {
    ...raw,
    roomCode: (pick<string>('roomCode') ?? docId) || docId,
    status,
    hostUid: pick<string>('hostUid'),
    hostName: pick<string>('hostName'),
    hostPhotoURL: pick<string>('hostPhotoURL', 'hostPhoto'),
    guestUid: pick<string>('guestUid'),
    guestName: pick<string>('guestName'),
    guestPhotoURL: pick<string>('guestPhotoURL', 'guestPhoto'),
    winnerUid: pick<string>('winnerUid', 'roomWinnerUid'),
    loserUid: pick<string>('loserUid'),
    roomWinnerUid: pick<string>('roomWinnerUid', 'winnerUid'),
    finalResult: pick<string>('finalResult', 'resultReason', 'result'),
    resultReason: pick<string>('resultReason', 'finalResult'),
    result: pick<string>('result', 'finalResult', 'resultReason'),
    betEnabled,
    bettingEnabled: betEnabled,
    betAmount: pick<number>('betAmount'),
    prizePool: pick<number>('prizePool', 'potAmount'),
    potAmount: pick<number>('potAmount', 'prizePool'),
    coinsWon: pick<number>('coinsWon'),
    payoutApplied: pick<boolean>('payoutApplied'),
    prizePaid: pick<boolean>('prizePaid'),
    roundsCount,
    roundCount: roundsCount,
    roundMaps: pick<unknown[]>('roundMaps'),
    board: pick<Array<string | null>>('board'),
    boardSize: pick<number>('boardSize'),
    createdAt: pick<number>('createdAt'),
    startedAt: pick<number>('startedAt'),
    finishedAt: pick<number>('finishedAt'),
    updatedAt: pick<number>('updatedAt', 'finishedAt'),
    matchId: pick<string>('matchId'),
    players: pick<Record<string, never>>('players'),
    isArchived: true,
  } as ArenaRoom;
}
