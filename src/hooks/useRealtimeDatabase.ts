import { useState, useEffect } from 'react';
import { ref, onValue, query as rtdbQuery, orderByChild, limitToLast } from 'firebase/database';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, rtdb, RTDB_DATABASE_URL } from '../firebase/config';

export interface RtdbError extends Error {
  /** Firebase error code, e.g. `permission_denied`, `database/permission-denied`. */
  code?: string;
}

interface UseRealtimeDatabaseResult<T> {
  data: T[];
  loading: boolean;
  error: RtdbError | null;
}

interface UseRealtimeDatabaseOptions<T> {
  orderBy?: string;
  limitToLast?: number;
  transform?: (key: string, val: unknown) => T;
}

const ROOMS_PATH_PREFIX = 'rooms';

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function shouldLogRooms(path: string): boolean {
  if (!import.meta.env.DEV) return false;
  return path === ROOMS_PATH_PREFIX || path.startsWith(`${ROOMS_PATH_PREFIX}/`);
}

export function useRealtimeDatabase<T>(
  path: string | null,
  options?: UseRealtimeDatabaseOptions<T>
): UseRealtimeDatabaseResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<RtdbError | null>(null);

  const orderByField = options?.orderBy;
  const limitCount = options?.limitToLast;
  const transform = options?.transform;

  useEffect(() => {
    if (!path) {
      return;
    }

    let valueUnsub: (() => void) | null = null;
    let cancelled = false;

    const attachListener = (user: User | null) => {
      // Tear down any prior listener whenever auth changes.
      if (valueUnsub) {
        valueUnsub();
        valueUnsub = null;
      }
      if (cancelled) return;
      if (!user) {
        // Defer subscription until the admin is signed in — RTDB rules require auth.
        setLoading(true);
        setError(null);
        setData([]);
        return;
      }

      const dbRef = ref(rtdb, path);
      let dbQuery = rtdbQuery(dbRef);

      if (orderByField) {
        dbQuery = rtdbQuery(dbRef, orderByChild(orderByField));
      }
      if (typeof limitCount === 'number' && limitCount > 0) {
        dbQuery = orderByField
          ? rtdbQuery(dbRef, orderByChild(orderByField), limitToLast(limitCount))
          : rtdbQuery(dbRef, limitToLast(limitCount));
      }

      const logRooms = shouldLogRooms(path);
      if (logRooms) {
        console.info(`[Rooms] read path: /${path}`);
      }

      valueUnsub = onValue(
        dbQuery,
        (snapshot) => {
          const items: T[] = [];
          let firstKey: string | null = null;
          let firstSampleKeys: string[] = [];
          let rawSize = 0;

          snapshot.forEach((child) => {
            rawSize += 1;
            const key = child.key;
            const val = child.val();
            if (key == null) return;
            // Skip tombstoned/nullish children. RTDB can yield null for cleared keys.
            if (val == null) return;
            if (transform) {
              items.push(transform(key, val));
            } else {
              // Only spread object payloads — scalar children would corrupt the array shape.
              if (!isPlainObject(val)) return;
              // Spread payload first, then assign the RTDB key as the canonical roomCode.
              items.push({ ...val, roomCode: key } as T);
              if (firstKey === null) {
                firstKey = key;
                firstSampleKeys = Object.keys(val).slice(0, 24);
              }
            }
          });

          if (logRooms) {
            console.info(`[Rooms] snapshot exists: ${snapshot.exists()}`);
            console.info(`[Rooms] snapshot size: ${rawSize}`);
            console.info(`[Rooms] normalized count: ${items.length}`);
            if (firstKey) {
              console.info(
                `[Rooms] first room sample: ${firstKey} fields=[${firstSampleKeys.join(', ')}]`
              );
            }
          }

          setData(items);
          setLoading(false);
          setError(null);
        },
        (err) => {
          const e: RtdbError = err instanceof Error ? err : new Error(String(err));
          // Firebase RTDB errors carry a non-enumerable `code` on the prototype.
          const code = (err as { code?: string })?.code;
          if (code) e.code = code;
          if (shouldLogRooms(path) || import.meta.env.DEV) {
            console.error(
              `[RTDB] ${path} read failed (url=${RTDB_DATABASE_URL}, code=${code ?? 'n/a'}):`,
              err
            );
            if (shouldLogRooms(path)) {
              console.info(`[Rooms] last error code: ${code ?? 'n/a'}`);
              console.info(`[Rooms] last error message: ${e.message}`);
            }
          }
          setError(e);
          setLoading(false);
        }
      );
    };

    const authUnsub = onAuthStateChanged(auth, attachListener);

    return () => {
      cancelled = true;
      authUnsub();
      if (valueUnsub) valueUnsub();
    };
  }, [path, orderByField, limitCount, transform]);

  return path ? { data, loading, error } : { data: [], loading: false, error: null };
}
