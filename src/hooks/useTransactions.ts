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
import { useDataStore } from '../stores/dataStore';
import { iapTransactionDisplayTime, type IAPTransaction } from '../types/transaction';

interface UseTransactionsOptions {
  liveLimit?: number;
  pageSize?: number;
}

interface UseTransactionsResult {
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

function mergeTransactions(liveTransactions: IAPTransaction[], pagedTransactions: IAPTransaction[]) {
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

function useFilteredTransactions(
  emailFilter: string | undefined,
  options?: UseTransactionsOptions
): UseTransactionsResult {
  const liveLimit = options?.liveLimit;
  const pageSize = options?.pageSize ?? 100;
  const enabled = Boolean(emailFilter);

  const constraints = useMemo(() => {
    if (!emailFilter) return [];

    const c: QueryConstraint[] = [where('email', '==', emailFilter), orderBy('createdAt', 'desc')];
    if (typeof liveLimit === 'number' && liveLimit > 0) {
      c.push(limit(liveLimit));
    }
    return c;
  }, [emailFilter, liveLimit]);

  const [liveData, setLiveData] = useState<IAPTransaction[]>([]);
  const [pagedData, setPagedData] = useState<IAPTransaction[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
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
    setHasMore(typeof liveLimit === 'number' && liveLimit > 0);
    setLiveData([]);
    setPagedData([]);
    setCursor(null);

    const transactionsCollection = collection(db, COLLECTIONS.transactions);
    const transactionsQuery = query(transactionsCollection, ...constraints);

    const unsubscribe = onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp ?? data.createdAt ?? data.verifiedAt,
            purchaseToken: data.purchaseToken ?? data.purchaseTokenHash,
          } as IAPTransaction;
        });
        setLiveData(docs);
        setCursor((prevCursor) => {
          if (prevCursor) return prevCursor;
          return snapshot.docs[snapshot.docs.length - 1] ?? null;
        });
        if (typeof liveLimit === 'number' && liveLimit > 0 && snapshot.docs.length < liveLimit) {
          setHasMore(false);
        }
        setLoading(false);
      },
      (snapshotError) => {
        console.error('Firestore error on filtered transactions:', snapshotError);
        setError(snapshotError);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [constraints, enabled, liveLimit]);

  const loadMore = useCallback(async () => {
    if (!emailFilter || loadingMore || !hasMore || !cursor || !(typeof liveLimit === 'number' && liveLimit > 0)) return;

    setLoadingMore(true);
    setError(null);

    try {
      const transactionsCollection = collection(db, COLLECTIONS.transactions);
      const nextQuery = query(
        transactionsCollection,
        where('email', '==', emailFilter),
        orderBy('createdAt', 'desc'),
        startAfter(cursor),
        limit(pageSize)
      );
      const snapshot = await getDocs(nextQuery);
      const docs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp ?? data.createdAt ?? data.verifiedAt,
          purchaseToken: data.purchaseToken ?? data.purchaseTokenHash,
        } as IAPTransaction;
      });

      setPagedData((current) => mergeTransactions(current, docs));

      const nextCursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setCursor(nextCursor);
      setHasMore(snapshot.docs.length === pageSize && nextCursor !== null);
    } catch (loadError) {
      console.error('Failed to load more filtered transactions:', loadError);
      setError(loadError as Error);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, emailFilter, hasMore, liveLimit, loadingMore, pageSize]);

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

export function useTransactions(emailFilter?: string, options?: UseTransactionsOptions): UseTransactionsResult {
  const data = useDataStore((state) => state.transactions) as IAPTransaction[];
  const loading = useDataStore((state) => state.transactionsLoading);
  const error = useDataStore((state) => state.transactionsError);
  const loadMore = useCallback(async () => {}, []);
  const filteredResult = useFilteredTransactions(emailFilter, options);

  if (emailFilter) {
    return filteredResult;
  }

  return {
    data,
    loading,
    error,
    loadingMore: false,
    hasMore: false,
    loadMore,
  };
}
