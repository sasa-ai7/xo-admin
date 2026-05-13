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
import type { UserLog } from '../types/userLog';
import type { UserLogDetails } from '../types/userLog';
import { COLLECTIONS } from '../firebase/collections';

interface UseUserLogsForUserOptions {
  liveLimit?: number;
  pageSize?: number;
  /** Firestore doc ID — used as fallback when it differs from the Firebase Auth UID. */
  docIdFallback?: string | null;
}

interface UseUserLogsForUserResult {
  data: UserLog[];
  loading: boolean;
  error: Error | null;
  auditError: Error | null;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

const LIVE_REFRESH_INTERVAL_MS = 15000;

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

function logSortKey(log: UserLog): unknown {
  return log.timestamp ?? log.createdAt;
}

function mapAuditDocToUserLog(doc: QueryDocumentSnapshot<DocumentData>): UserLog {
  const data = doc.data();
  const meta =
    typeof data.metadata === 'object' && data.metadata !== null
      ? (data.metadata as Record<string, unknown>)
      : {};
  const eventType =
    typeof data.eventName === 'string' ? data.eventName :
    typeof data.type === 'string' ? data.type :
    typeof data.action === 'string' ? data.action : 'audit';
  // Flatten metadata into details so LogRow can read result/coinsAdded/etc.
  const details: UserLogDetails = { ...meta, ...data, metadata: undefined } as UserLogDetails;
  return {
    id: `audit:${doc.id}`,
    uid: typeof data.uid === 'string' ? data.uid : undefined,
    eventType,
    eventName: typeof data.eventName === 'string' ? data.eventName : undefined,
    platform: typeof data.platform === 'string' ? data.platform : undefined,
    timestamp: data.createdAt ?? data.timestamp,
    createdAt: data.createdAt,
    details,
  };
}

function mapUserLogDoc(doc: QueryDocumentSnapshot<DocumentData>): UserLog {
  const data = doc.data();
  // user_logs store fields at the document root (flat), so use root as details fallback
  const nested = typeof data.details === 'object' && data.details !== null
    ? (data.details as UserLogDetails)
    : null;
  const details: UserLogDetails = nested ?? (data as UserLogDetails);
  return { id: doc.id, ...data, details } as UserLog;
}

function mergeLogs(liveLogs: UserLog[], pagedLogs: UserLog[]) {
  const merged = [...liveLogs, ...pagedLogs];
  const seen = new Set<string>();

  return merged
    .filter((log) => {
      if (!log.id) return false;
      if (seen.has(log.id)) return false;
      seen.add(log.id);
      return true;
    })
    .sort((a, b) => {
      const timeDiff = toMs(logSortKey(b)) - toMs(logSortKey(a));
      if (timeDiff !== 0) return timeDiff;
      return b.id.localeCompare(a.id);
    });
}

function buildUidConstraints(
  uid: string,
  docIdFallback: string | null | undefined,
  extra: QueryConstraint[]
): QueryConstraint[] {
  if (docIdFallback && docIdFallback !== uid) {
    return [where('uid', 'in', [uid, docIdFallback]), ...extra];
  }
  return [where('uid', '==', uid), ...extra];
}

export function useUserLogsForUser(
  uid: string | null,
  options?: UseUserLogsForUserOptions
): UseUserLogsForUserResult {
  const liveLimit = options?.liveLimit ?? 200;
  const pageSize = options?.pageSize ?? 100;
  const docIdFallback = options?.docIdFallback ?? null;

  const userConstraints = useMemo(() => {
    if (!uid) return [];
    return buildUidConstraints(uid, docIdFallback, [
      orderBy('createdAt', 'desc'),
      limit(liveLimit),
    ]);
  }, [uid, docIdFallback, liveLimit]);

  const auditConstraints = useMemo(() => {
    if (!uid) return [];
    return buildUidConstraints(uid, docIdFallback, [
      orderBy('createdAt', 'desc'),
      limit(liveLimit),
    ]);
  }, [uid, docIdFallback, liveLimit]);

  const [liveUserLogs, setLiveUserLogs] = useState<UserLog[]>([]);
  const [liveAuditLogs, setLiveAuditLogs] = useState<UserLog[]>([]);
  const [pagedData, setPagedData] = useState<UserLog[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [auditError, setAuditError] = useState<Error | null>(null);

  const refreshLiveWindow = useCallback(async () => {
    if (!uid) return;

    try {
      const userCol = collection(db, COLLECTIONS.userLogs);
      const userQ = query(userCol, ...userConstraints);
      const userSnap = await getDocs(userQ);
      setLiveUserLogs(userSnap.docs.map((d) => mapUserLogDoc(d)));
      setCursor(userSnap.docs[userSnap.docs.length - 1] ?? null);
      setHasMore(userSnap.docs.length === liveLimit);
      setError(null);

      try {
        const auditCol = collection(db, COLLECTIONS.auditLogs);
        const auditQ = query(auditCol, ...auditConstraints);
        const auditSnap = await getDocs(auditQ);
        setLiveAuditLogs(auditSnap.docs.map((d) => mapAuditDocToUserLog(d)));
        setAuditError(null);
      } catch (auditErr) {
        console.warn('[AccountLogs] audit refresh failed:', auditErr);
        setAuditError(auditErr instanceof Error ? auditErr : new Error(String(auditErr)));
      }
    } catch (refreshError) {
      console.error('[AccountLogs] user_logs refresh failed:', refreshError);
      setError(refreshError as Error);
    }
  }, [auditConstraints, liveLimit, uid, userConstraints]);

  useEffect(() => {
    if (!uid) {
      setLiveUserLogs([]);
      setLiveAuditLogs([]);
      setPagedData([]);
      setCursor(null);
      setLoading(false);
      setLoadingMore(false);
      setHasMore(false);
      setError(null);
      setAuditError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setAuditError(null);
    setHasMore(true);
    setLiveUserLogs([]);
    setLiveAuditLogs([]);
    setPagedData([]);
    setCursor(null);

    const userCol = collection(db, COLLECTIONS.userLogs);
    const userQ = query(userCol, ...userConstraints);

    const unsubUser = onSnapshot(
      userQ,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => mapUserLogDoc(d));
        setLiveUserLogs(docs);
        setCursor(snapshot.docs[snapshot.docs.length - 1] ?? null);
        setHasMore(snapshot.docs.length === liveLimit);
        setLoading(false);
        if (import.meta.env.DEV) {
          console.info(
            '[AccountLogs] user_logs uid=%s docIdFallback=%s count=%d',
            uid, docIdFallback ?? 'none', docs.length
          );
        }
      },
      (snapshotError) => {
        console.error('[AccountLogs] user_logs snapshot error:', snapshotError);
        setError(snapshotError);
        setLoading(false);
      }
    );

    const auditCol = collection(db, COLLECTIONS.auditLogs);
    const auditQ = query(auditCol, ...auditConstraints);
    const unsubAudit = onSnapshot(
      auditQ,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => mapAuditDocToUserLog(d));
        setLiveAuditLogs(docs);
        setAuditError(null);
        if (import.meta.env.DEV) {
          console.info(
            '[AccountLogs] audit_logs uid=%s docIdFallback=%s count=%d',
            uid, docIdFallback ?? 'none', docs.length
          );
        }
      },
      (auditErr) => {
        console.warn('[AccountLogs] audit_logs listener failed:', auditErr);
        setAuditError(auditErr instanceof Error ? auditErr : new Error(String(auditErr)));
        setLiveAuditLogs([]);
      }
    );

    return () => {
      unsubUser();
      unsubAudit();
    };
  }, [uid, docIdFallback, userConstraints, auditConstraints, liveLimit]);

  useEffect(() => {
    if (!uid || typeof window === 'undefined') return;

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
  }, [refreshLiveWindow, uid]);

  const loadMore = useCallback(async () => {
    if (!uid || loadingMore || !hasMore || !cursor) return;

    setLoadingMore(true);
    setError(null);

    try {
      const logsCollection = collection(db, COLLECTIONS.userLogs);
      const nextQuery = query(
        logsCollection,
        ...buildUidConstraints(uid, docIdFallback, [
          orderBy('createdAt', 'desc'),
          startAfter(cursor),
          limit(pageSize),
        ])
      );
      const snapshot = await getDocs(nextQuery);
      const docs = snapshot.docs.map((doc) => mapUserLogDoc(doc));

      setPagedData((current) => mergeLogs(current, docs));

      const nextCursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
      setCursor(nextCursor);
      setHasMore(snapshot.docs.length === pageSize && nextCursor !== null);
    } catch (loadError) {
      console.error('[AccountLogs] loadMore failed:', loadError);
      setError(loadError as Error);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, docIdFallback, hasMore, loadingMore, pageSize, uid]);

  const liveMerged = useMemo(
    () => mergeLogs(liveUserLogs, liveAuditLogs),
    [liveUserLogs, liveAuditLogs]
  );

  const data = useMemo(() => mergeLogs(liveMerged, pagedData), [liveMerged, pagedData]);

  return {
    data,
    loading,
    error,
    auditError,
    loadingMore,
    hasMore,
    loadMore,
  };
}
