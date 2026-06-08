import { useMemo } from 'react';
import { useRealtimeDatabase } from './useRealtimeDatabase';
import { RTDB_PATHS } from '../firebase/collections';
import {
  ACTIVE_ROOM_STATUSES,
  TERMINAL_ROOM_STATUSES,
  countMoves,
  countPlayers,
  type ArenaRoom,
} from '../types/room';

interface UseArenaRoomsOptions {
  limitCount?: number;
}

export function useArenaRooms(options?: UseArenaRoomsOptions) {
  const { data: rawRooms, loading, error } = useRealtimeDatabase<ArenaRoom>(
    RTDB_PATHS.rooms,
    { limitToLast: options?.limitCount ?? 200 }
  );

  const data = useMemo<ArenaRoom[]>(() => {
    return rawRooms
      .map((room) => {
        const status = room.status;
        return {
          ...room,
          playerCount: countPlayers(room),
          movesCount: countMoves(room.moves),
          hasGuest: Boolean(room.guestUid),
          isTerminal: status ? TERMINAL_ROOM_STATUSES.has(status) : false,
          isActive: status ? ACTIVE_ROOM_STATUSES.has(status) : false,
        };
      })
      .sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0));
  }, [rawRooms]);

  return { data, loading, error };
}
