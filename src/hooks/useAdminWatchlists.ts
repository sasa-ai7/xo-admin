import { useEffect, useState, useCallback } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS, adminWatchlistsCollection } from '../firebase/collections';
import { auth } from '../firebase/config';
import type { AdminWatchlistFolder } from '../types/watchlist';

interface Result {
  data: AdminWatchlistFolder[];
  loading: boolean;
  error: Error | null;
}

export function useAdminWatchlists(): Result {
  const [data, setData] = useState<AdminWatchlistFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const q = query(adminWatchlistsCollection, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminWatchlistFolder));
        setData(rows);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useAdminWatchlists] error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { data, loading, error };
}

export function useAdminWatchlistFolder(folderId: string | null): {
  data: AdminWatchlistFolder | null;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<AdminWatchlistFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!folderId) {
      return;
    }
    const ref = doc(db, COLLECTIONS.adminWatchlists, folderId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setData({ id: snap.id, ...snap.data() } as AdminWatchlistFolder);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [folderId]);

  return folderId ? { data, loading, error } : { data: null, loading: false, error: null };
}

function currentAdminInfo() {
  const user = auth.currentUser;
  return {
    uid: user?.uid ?? '',
    email: user?.email ?? '',
  };
}

export async function createWatchlistFolder(
  name: string,
  description: string,
  color: string
): Promise<string> {
  const { uid, email } = currentAdminInfo();
  const docRef = await addDoc(adminWatchlistsCollection, {
    name: name.trim(),
    description: description.trim(),
    color,
    createdByUid: uid,
    createdByEmail: email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    userIds: [],
  });
  return docRef.id;
}

export async function renameWatchlistFolder(folderId: string, name: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.adminWatchlists, folderId);
  await updateDoc(ref, { name: name.trim(), updatedAt: serverTimestamp() });
}

export async function deleteWatchlistFolder(folderId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.adminWatchlists, folderId);
  await deleteDoc(ref);
}

export function useWatchlistFolderActions(folderId: string) {
  const addUser = useCallback(
    async (uid: string) => {
      const ref = doc(db, COLLECTIONS.adminWatchlists, folderId);
      await updateDoc(ref, { userIds: arrayUnion(uid), updatedAt: serverTimestamp() });
    },
    [folderId]
  );

  const removeUser = useCallback(
    async (uid: string) => {
      const ref = doc(db, COLLECTIONS.adminWatchlists, folderId);
      await updateDoc(ref, { userIds: arrayRemove(uid), updatedAt: serverTimestamp() });
    },
    [folderId]
  );

  return { addUser, removeUser };
}
