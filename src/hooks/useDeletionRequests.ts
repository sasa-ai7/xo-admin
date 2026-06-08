import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import { firestoreErrCode, isPermissionDenied } from '../utils/firestoreQueryHelpers';
import { toMs } from '../utils/relativeTime';
import type { DeletionRequest } from '../types/deletionRequest';

export function useDeletionRequests() {
  const [data, setData] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Some projects haven't yet provisioned this collection. A plain query
    // without orderBy avoids the index requirement; we sort client-side.
    const q = query(collection(db, COLLECTIONS.deletionRequests));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DeletionRequest[];
        rows.sort((a, b) => {
          const av = toMs(a.createdAt ?? a.requestedAt ?? a.updatedAt) ?? 0;
          const bv = toMs(b.createdAt ?? b.requestedAt ?? b.updatedAt) ?? 0;
          return bv - av;
        });
        setData(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Permission-denied is expected when admin rules are missing — treat as empty,
        // not as a global failure that nukes the dashboard.
        if (isPermissionDenied(err)) {
          console.warn(`[Firestore] deletion_requests permission-denied — treating as empty.`);
          setData([]);
          setLoading(false);
          setError(null);
          return;
        }
        console.error(`[Firestore] deletion_requests read failed: ${firestoreErrCode(err)}`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { data, loading, error };
}
