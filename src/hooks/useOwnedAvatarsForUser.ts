import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, USER_SUBCOLLECTIONS } from '../firebase/collections';
import { firestoreErrCode } from '../utils/firestoreQueryHelpers';

export interface OwnedAvatar {
  id: string;
  avatarId?: number | string;
  productId?: string;
  avatarAsset?: string;
  ownedAt?: unknown;
  unlockedAt?: unknown;
  source?: string;
  verified?: boolean;
  trustedRevenue?: boolean;
  orderId?: string;
  [key: string]: unknown;
}

interface Result {
  data: OwnedAvatar[];
  loading: boolean;
  error: Error | null;
}

export function useOwnedAvatarsForUser(uid: string | null): Result {
  const [data, setData] = useState<OwnedAvatar[]>([]);
  const [resolvedUid, setResolvedUid] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!uid) return;

    const col = collection(db, COLLECTIONS.users, uid, USER_SUBCOLLECTIONS.ownedAvatars);
    const q = query(col, limit(100));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as OwnedAvatar[];
        setData(rows);
        setResolvedUid(uid);
        setError(null);
      },
      (err) => {
        console.error(`[useOwnedAvatarsForUser] uid=${uid} error: ${firestoreErrCode(err)}`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setResolvedUid(uid);
      }
    );

    return () => unsub();
  }, [uid]);

  return { data, loading: uid !== null && resolvedUid !== uid, error };
}
