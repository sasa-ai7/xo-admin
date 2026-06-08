import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import { firestoreErrCode, isPermissionDenied } from '../utils/firestoreQueryHelpers';
import { toMs } from '../utils/relativeTime';
import type { DeletedAccountRecord } from '../types/deletionRequest';

export function useDeletedAccounts() {
  const [data, setData] = useState<DeletedAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.deletedAccounts));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DeletedAccountRecord[];
        rows.sort((a, b) => {
          const av = toMs(a.deletedAt ?? a.createdAt) ?? 0;
          const bv = toMs(b.deletedAt ?? b.createdAt) ?? 0;
          return bv - av;
        });
        setData(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (isPermissionDenied(err)) {
          console.warn(`[Firestore] deleted_accounts permission-denied — treating as empty.`);
          setData([]);
          setLoading(false);
          setError(null);
          return;
        }
        console.error(`[Firestore] deleted_accounts read failed: ${firestoreErrCode(err)}`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { data, loading, error };
}
