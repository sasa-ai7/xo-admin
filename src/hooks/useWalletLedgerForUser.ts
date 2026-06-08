import { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, USER_SUBCOLLECTIONS } from '../firebase/collections';
import { firestoreErrCode } from '../utils/firestoreQueryHelpers';

export interface WalletLedgerEntry {
  id: string;
  coinsAdded?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  productId?: string;
  orderId?: string;
  source?: string;
  status?: string;
  createdAt?: unknown;
  [key: string]: unknown;
}

interface Result {
  data: WalletLedgerEntry[];
  loading: boolean;
  error: Error | null;
}

export function useWalletLedgerForUser(uid: string | null): Result {
  const [data, setData] = useState<WalletLedgerEntry[]>([]);
  const [resolvedUid, setResolvedUid] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) return;

    const col = collection(db, COLLECTIONS.users, uid, USER_SUBCOLLECTIONS.walletLedger);
    const q = query(col, orderBy('createdAt', 'desc'), limit(100));

    let unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as WalletLedgerEntry[];
        setData(rows);
        setResolvedUid(uid);
        setError(null);
      },
      (err) => {
        console.error(`[useWalletLedgerForUser] uid=${uid} error: ${firestoreErrCode(err)}`, err);
        if (firestoreErrCode(err) !== 'permission-denied') {
          const fallback = query(col, limit(100));
          unsub();
          unsub = onSnapshot(
            fallback,
            (snap) => {
              const rows = (snap.docs.map((d) => ({ id: d.id, ...d.data() })) as WalletLedgerEntry[]).sort(
                (a, b) => {
                  const ta = a.createdAt instanceof Object && 'toDate' in (a.createdAt as object)
                    ? (a.createdAt as { toDate(): Date }).toDate().getTime()
                    : Number(a.createdAt ?? 0);
                  const tb = b.createdAt instanceof Object && 'toDate' in (b.createdAt as object)
                    ? (b.createdAt as { toDate(): Date }).toDate().getTime()
                    : Number(b.createdAt ?? 0);
                  return tb - ta;
                }
              );
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
