import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import { normalizePurchaseOrder, type PurchaseOrder } from '../types/purchaseOrder';
import { firestoreErrCode } from '../utils/firestoreQueryHelpers';

interface Result {
  data: PurchaseOrder[];
  loading: boolean;
  error: Error | null;
}

export function usePurchaseOrdersForUser(uid: string | null): Result {
  const [data, setData] = useState<PurchaseOrder[]>([]);
  const [resolvedUid, setResolvedUid] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) return;

    const col = collection(db, COLLECTIONS.purchaseOrders);
    const q = query(col, where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(200));

    let unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) =>
          normalizePurchaseOrder(d.id, d.data() as Record<string, unknown>)
        );
        setData(rows);
        setResolvedUid(uid);
        setError(null);
      },
      (err) => {
        console.error(`[usePurchaseOrdersForUser] uid=${uid} error: ${firestoreErrCode(err)}`, err);
        if (firestoreErrCode(err) !== 'permission-denied') {
          const fallback = query(col, where('uid', '==', uid), limit(200));
          unsub();
          unsub = onSnapshot(
            fallback,
            (snap) => {
              const rows = snap.docs
                .map((d) => normalizePurchaseOrder(d.id, d.data() as Record<string, unknown>))
                .sort((a, b) => {
                  const ta = a.createdAt instanceof Object && 'toDate' in (a.createdAt as object)
                    ? (a.createdAt as { toDate(): Date }).toDate().getTime()
                    : Number(a.createdAt ?? 0);
                  const tb = b.createdAt instanceof Object && 'toDate' in (b.createdAt as object)
                    ? (b.createdAt as { toDate(): Date }).toDate().getTime()
                    : Number(b.createdAt ?? 0);
                  return tb - ta;
                });
              setData(rows);
              setResolvedUid(uid);
              setError(null);
            },
            (err2) => {
              setError(err2 instanceof Error ? err2 : new Error(String(err2)));
              setResolvedUid(uid);
            }
          );
          return;
        }
        setError(err instanceof Error ? err : new Error(String(err)));
        setResolvedUid(uid);
      }
    );

    return () => unsub();
  }, [uid]);

  return { data, loading: uid !== null && resolvedUid !== uid, error };
}
