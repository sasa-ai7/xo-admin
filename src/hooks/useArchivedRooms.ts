import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import {
  ACTIVE_ROOM_STATUSES,
  TERMINAL_ROOM_STATUSES,
  countMoves,
  countPlayers,
  type ArenaRoom,
} from '../types/room';
import { firestoreErrCode } from '../utils/firestoreQueryHelpers';
import { normalizeArchivedRoom } from '../utils/normalizeArchivedRoom';

interface UseArchivedRoomsOptions {
  initialLimit?: number;
  pageSize?: number;
}

/**
 * Subscribes to the Firestore `online_room_history` collection — the canonical
 * archive of finished arena rooms. Docs may use legacy field names
 * (bettingEnabled, roundCount, potAmount, resultReason) which the normalizer
 * aliases onto the unified ArenaRoom shape consumed by RoomCard / RoomDetailsDrawer.
 */
export function useArchivedRooms(options?: UseArchivedRoomsOptions) {
  const initial = options?.initialLimit ?? 100;
  const pageSize = options?.pageSize ?? 100;
  const [limitN, setLimitN] = useState(initial);
  const [rawRooms, setRawRooms] = useState<ArenaRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.onlineRoomHistory),
      orderBy('finishedAt', 'desc'),
      limit(limitN)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: ArenaRoom[] = snap.docs.map((d) =>
          normalizeArchivedRoom(d.data() as Record<string, unknown>, d.id)
        );
        setRawRooms(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(
          `[Firestore] online_room_history read failed: ${firestoreErrCode(err)}`,
          err
        );
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [limitN]);

  const data = useMemo<ArenaRoom[]>(() => {
    return rawRooms.map((room) => {
      const status = room.status;
      return {
        ...room,
        playerCount: countPlayers(room),
        movesCount: countMoves(room.moves),
        hasGuest: Boolean(room.guestUid),
        isTerminal: status ? TERMINAL_ROOM_STATUSES.has(status) : true,
        isActive: status ? ACTIVE_ROOM_STATUSES.has(status) : false,
      };
    });
  }, [rawRooms]);

  const loadMore = useCallback(() => {
    setLoading(true);
    setError(null);
    setLimitN((n) => n + pageSize);
  }, [pageSize]);

  return { data, loading, error, loadMore, hasMore: data.length === limitN, limitN };
}
