import { useState, useEffect } from 'react';
import { onSnapshot, query, type QueryConstraint, collection } from 'firebase/firestore';
import { db } from '../firebase/config';

const EMPTY_QUERY_CONSTRAINTS: QueryConstraint[] = [];

interface UseFirestoreCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
}

export function useFirestoreCollection<T>(
  path: string,
  constraints: QueryConstraint[] = EMPTY_QUERY_CONSTRAINTS,
  deps?: unknown[]
): UseFirestoreCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const depsKey = deps ? JSON.stringify(deps) : 'static';

  useEffect(() => {
    if (!path || path === '__noop__') {
      return;
    }

    let active = true;

    const col = collection(db, path);
    const c = constraints;
    const q = c.length > 0 ? query(col, ...c) : query(col);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        setData(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]
        );
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (!active) return;
        console.error(`Firestore error on ${path}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [path, depsKey, constraints]);

  return !path || path === '__noop__' ? { data: [], loading: false, error: null } : { data, loading, error };
}
