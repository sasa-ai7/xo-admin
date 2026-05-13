import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

export function firestoreErrCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code: string }).code);
  }
  return 'unknown';
}

export function isPermissionDenied(err: unknown): boolean {
  return firestoreErrCode(err) === 'permission-denied';
}

interface SubscribeOrderedOptions<T> {
  limitN: number;
  /** Maps raw docs to domain rows (fallback path may receive unsorted docs). */
  mapDocs: (docs: QueryDocumentSnapshot<DocumentData>[]) => T[];
  onUpdate: (items: T[], info: { mode: 'ordered' | 'fallback'; size: number }) => void;
  onPermissionDenied: (err: unknown) => void;
  onFatalError: (err: unknown) => void;
  label: string;
}

/**
 * Subscribes with orderBy(createdAt desc). On failure (except permission-denied), falls back to
 * a plain limit() query and sorts client-side using whatever timestamps exist on mapped rows.
 */
export function subscribeCreatedAtOrFallback<T>(
  db: Firestore,
  collectionPath: string,
  options: SubscribeOrderedOptions<T>
): () => void {
  const { limitN, mapDocs, onUpdate, onPermissionDenied, onFatalError, label } = options;
  const col = collection(db, collectionPath);
  const ordered = query(col, orderBy('createdAt', 'desc'), limit(limitN));

  let unsub = onSnapshot(
    ordered,
    (snapshot) => {
      const rows = mapDocs(snapshot.docs);
      onUpdate(rows, { mode: 'ordered', size: snapshot.size });
    },
    (err) => {
      if (isPermissionDenied(err)) {
        console.error(`[Firestore] ${label} read failed: permission-denied`, err);
        onPermissionDenied(err);
        return;
      }
      console.warn(
        `[Firestore] ${label} orderBy createdAt failed, using fallback (${firestoreErrCode(err)})`
      );
      unsub();
      const fb = query(col, limit(Math.min(500, Math.max(limitN * 3, limitN))));
      unsub = onSnapshot(
        fb,
        (snapshot) => {
          const rows = mapDocs(snapshot.docs);
          onUpdate(rows, { mode: 'fallback', size: snapshot.size });
        },
        (err2) => {
          console.error(`[Firestore] ${label} read failed: ${firestoreErrCode(err2)}`, err2);
          if (isPermissionDenied(err2)) {
            onPermissionDenied(err2);
          } else {
            onFatalError(err2);
          }
        }
      );
    }
  );

  return () => unsub();
}
