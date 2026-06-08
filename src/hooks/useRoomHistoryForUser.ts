import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { RoomHistory } from '../types/roomHistory';
import type { UseRoomHistoryResult } from './useRoomHistory';

interface UseRoomHistoryForUserOptions {
  liveLimit?: number;
  pageSize?: number;
}

function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate(): Date }).toDate().getTime();
    } catch {
      return 0;
    }
  }
  return 0;
}

function mapDoc(doc: QueryDocumentSnapshot<DocumentData>): RoomHistory {
  const data = doc.data();
  return { id: doc.id, ...data } as RoomHistory;
}

function mergeMatches(live: RoomHistory[], paged: RoomHistory[]): RoomHistory[] {
  const seen = new Set<string>();
  return [...live, ...paged]
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
}

export function useRoomHistoryForUser(
  uid: string | null,
  options?: UseRoomHistoryForUserOptions
): UseRoomHistoryResult {
  const liveLimit = options?.liveLimit ?? 50;
  const pageSize = options?.pageSize ?? 50;

  const [liveData, setLiveData] = useState<RoomHistory[]>([]);
  const [pagedData, setPagedData] = useState<RoomHistory[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const collectionPath = uid ? `users/${uid}/onlineRoomHistory` : null;

  useEffect(() => {
    if (!collectionPath) {
      setLiveData([]);
      setPagedData([]);
      setCursor(null);
      setLoading(false);
      setHasMore(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setLiveData([]);
    setPagedData([]);
    setCursor(null);
    setHasMore(true);

    const col = collection(db, collectionPath);
    const q = query(col, orderBy('createdAt', 'desc'), limit(liveLimit));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(mapDoc);
        setLiveData(docs);
        setCursor((prev) => prev ?? snapshot.docs[snapshot.docs.length - 1] ?? null);
        if (snapshot.docs.length < liveLimit) setHasMore(false);
        setLoading(false);
      },
      (err) => {
        console.error(`[RoomHistoryForUser] ${collectionPath} error:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionPath, liveLimit]);

  const loadMore = useCallback(async () => {
    if (!collectionPath || loadingMore || !hasMore || !cursor) return;

    setLoadingMore(true);
    setError(null);

    try {
      const col = collection(db, collectionPath);
      const nextQuery = query(col, orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize));
      const snapshot = await getDocs(nextQuery);
      const docs = snapshot.docs.map(mapDoc);

      setPagedData((current) => mergeMatches(current, docs));
      const nextCursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setCursor(nextCursor);
      setHasMore(snapshot.docs.length === pageSize && nextCursor !== null);
    } catch (err) {
      console.error(`[RoomHistoryForUser] loadMore failed:`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingMore(false);
    }
  }, [collectionPath, cursor, hasMore, loadingMore, pageSize]);

  const data = useMemo(() => mergeMatches(liveData, pagedData), [liveData, pagedData]);

  return { data, loading, error, loadingMore, hasMore, loadMore };
}
