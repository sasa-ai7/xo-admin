import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { IAPTransaction } from '../types/transaction';
import { iapTransactionDisplayTime } from '../types/transaction';

const LIVE_REFRESH_INTERVAL_MS = 15000;

export interface UserTransactionFilter {
  uid?: string | null;
  email?: string | null;
}

interface UseUserTransactionsForUserOptions {
  liveLimit?: number;
  pageSize?: number;
}

interface UseUserTransactionsForUserResult {
  data: IAPTransaction[];
  loading: boolean;
  error: Error | null;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
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

function mapTxDoc(doc: QueryDocumentSnapshot<DocumentData>): IAPTransaction {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp ?? data.createdAt ?? data.verifiedAt,
    purchaseToken: data.purchaseToken ?? data.purchaseTokenHash,
  } as IAPTransaction;
}

function mergeTransactions(
  liveTransactions: IAPTransaction[],
  pagedTransactions: IAPTransaction[]
): IAPTransaction[] {
  const merged = [...liveTransactions, ...pagedTransactions];
  const seen = new Set<string>();

  return merged
    .filter((transaction) => {
      if (!transaction.id) return false;
      if (seen.has(transaction.id)) return false;
      seen.add(transaction.id);
      return true;
    })
    .sort((a, b) => {
      const timeDiff = toMs(iapTransactionDisplayTime(b)) - toMs(iapTransactionDisplayTime(a));
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });
}

/**
 * Fetches IAP transactions for a user. Prefers `uid` when set (new game), otherwise filters by `email`.
 */
export function useUserTransactionsForUser(
  filter: UserTransactionFilter,
  options?: UseUserTransactionsForUserOptions
): UseUserTransactionsForUserResult {
  const liveLimit = options?.liveLimit ?? 100;
  const pageSize = options?.pageSize ?? 100;
  const uid = filter.uid?.trim() || null;
  const email = filter.email?.trim() || null;
  const enabled = Boolean(uid || email);

  const constraints = useMemo(() => {
    if (!enabled) return { mode: 'none' as const, list: [] as QueryConstraint[] };

    if (uid) {
      const c: QueryConstraint[] = [
        where('uid', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(liveLimit),
      ];
      return { mode: 'uid' as const, list: c };
    }

    const c: QueryConstraint[] = [
      where('email', '==', email as string),
      orderBy('createdAt', 'desc'),
      limit(liveLimit),
    ];
    return { mode: 'email' as const, list: c };
  }, [email, enabled, liveLimit, uid]);

  const [liveData, setLiveData] = useState<IAPTransaction[]>([]);
  const [pagedData, setPagedData] = useState<IAPTransaction[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || constraints.mode === 'none') {
      setLiveData([]);
      setPagedData([]);
      setCursor(null);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setHasMore(true);
    setLiveData([]);
    setPagedData([]);
    setCursor(null);

    const transactionsCollection = collection(db, COLLECTIONS.transactions);
    const transactionsQuery = query(transactionsCollection, ...constraints.list);

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => mapTxDoc(d));

        setLiveData(docs);

        setCursor(snapshot.docs[snapshot.docs.length - 1] ?? null);

        if (snapshot.docs.length < liveLimit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }

        setLoading(false);
      },
      (snapshotError) => {
        console.error('Firestore error fetching user transactions:', snapshotError);
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [constraints, enabled, liveLimit]);

  const refreshLiveWindow = useCallback(async () => {
    if (!enabled || constraints.mode === 'none') return;

    try {
      const transactionsCollection = collection(db, COLLECTIONS.transactions);
      const transactionsQuery = query(transactionsCollection, ...constraints.list);
      const snapshot = await getDocs(transactionsQuery);
      const docs = snapshot.docs.map((d) => mapTxDoc(d));

      setLiveData(docs);
      setCursor(snapshot.docs[snapshot.docs.length - 1] ?? null);
      setHasMore(snapshot.docs.length === liveLimit);
      setError(null);
    } catch (refreshError) {
      console.error('Failed to refresh user transactions for user:', refreshError);
      setError(refreshError as Error);
    }
  }, [constraints, enabled, liveLimit]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void refreshLiveWindow();
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshLiveWindow();
    }, LIVE_REFRESH_INTERVAL_MS);

    window.addEventListener('focus', refreshLiveWindow);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshLiveWindow);
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    };
  }, [enabled, refreshLiveWindow]);

  const loadMore = useCallback(async () => {
    if (!enabled || constraints.mode === 'none' || loadingMore || !hasMore || !cursor) return;

    setLoadingMore(true);
    setError(null);

    try {
      const transactionsCollection = collection(db, COLLECTIONS.transactions);
      const nextQuery =
        constraints.mode === 'uid'
          ? query(
              transactionsCollection,
              where('uid', '==', uid as string),
              orderBy('createdAt', 'desc'),
              startAfter(cursor),
              limit(pageSize)
            )
          : query(
              transactionsCollection,
              where('email', '==', email as string),
              orderBy('createdAt', 'desc'),
              startAfter(cursor),
              limit(pageSize)
            );

      const snapshot = await getDocs(nextQuery);
      const docs = snapshot.docs.map((d) => mapTxDoc(d));

      setPagedData((current) => mergeTransactions(current, docs));

      const nextCursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setCursor(nextCursor);
      setHasMore(snapshot.docs.length === pageSize && nextCursor !== null);
    } catch (loadError) {
      console.error('Failed to load more user transactions:', loadError);
      setError(loadError as Error);
    } finally {
      setLoadingMore(false);
    }
  }, [constraints.mode, cursor, email, enabled, hasMore, loadingMore, pageSize, uid]);

  const data = useMemo(() => mergeTransactions(liveData, pagedData), [liveData, pagedData]);

  return {
    data,
    loading,
    error,
    loadingMore,
    hasMore,
    loadMore,
  };
}
