import { create } from 'zustand';
import {
  collection,
  onSnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';
import type { AppUser } from '../types/user';
import type { UserLog } from '../types/userLog';
import type { UserLogDetails } from '../types/userLog';
import type { IAPTransaction } from '../types/transaction';
import type { DeletionFeedback } from '../types/deletionFeedback';
import type { PurchaseOrder } from '../types/purchaseOrder';
import { normalizePurchaseOrder, purchaseOrderDisplayTime } from '../types/purchaseOrder';
import { normalizeAppUser } from '../utils/userNormalizer';
import { iapTransactionDisplayTime } from '../types/transaction';
import { firestoreErrCode, subscribeCreatedAtOrFallback } from '../utils/firestoreQueryHelpers';

interface DataStoreState {
  users: AppUser[];
  usersLoading: boolean;
  usersError: Error | null;
  userLogs: UserLog[];
  userLogsLoading: boolean;
  /** user_logs collection subscription */
  userLogsError: Error | null;
  /** audit_logs collection subscription */
  auditLogsError: Error | null;
  transactions: IAPTransaction[];
  transactionsLoading: boolean;
  transactionsError: Error | null;
  purchaseOrders: PurchaseOrder[];
  purchaseOrdersLoading: boolean;
  purchaseOrdersError: Error | null;
  deletionFeedback: DeletionFeedback[];
  deletionFeedbackLoading: boolean;
  deletionFeedbackError: Error | null;
  listenersStarted: boolean;
  /** Dev / dashboard diagnostics */
  debugSnapshotSizes: {
    users: number;
    userLogs: number;
    auditLogs: number;
    transactions: number;
    purchaseOrders: number;
    mergedRadarLogs: number;
  };
  startListeners: () => void;
  stopListeners: () => void;
  resetData: () => void;
}

const initialDataState = {
  users: [],
  usersLoading: true,
  usersError: null,
  userLogs: [],
  userLogsLoading: true,
  userLogsError: null,
  auditLogsError: null,
  transactions: [],
  transactionsLoading: true,
  transactionsError: null,
  purchaseOrders: [] as PurchaseOrder[],
  purchaseOrdersLoading: true,
  purchaseOrdersError: null,
  deletionFeedback: [],
  deletionFeedbackLoading: true,
  deletionFeedbackError: null,
  debugSnapshotSizes: {
    users: 0,
    userLogs: 0,
    auditLogs: 0,
    transactions: 0,
    purchaseOrders: 0,
    mergedRadarLogs: 0,
  },
};

let unsubscribers: Array<() => void> = [];

function getTimestampMs(value: unknown): number {
  if (!value) return 0;

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate(): Date }).toDate().getTime();
  }

  if (typeof value === 'number') return value;

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

function userLogSortTime(log: UserLog): unknown {
  return log.timestamp ?? log.createdAt;
}

function pickFirstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return undefined;
}

function mapAuditDocToUserLog(doc: QueryDocumentSnapshot<DocumentData>): UserLog {
  const data = doc.data();
  const metaObj = data.metadata;
  const meta = typeof metaObj === 'object' && metaObj !== null ? (metaObj as Record<string, unknown>) : {};

  const eventType =
    pickFirstString(data.eventName, data.type, data.action, data.message) ?? 'audit';

  const details: UserLogDetails = {
    ...meta,
  };

  const ts = data.createdAt ?? data.timestamp;

  return {
    id: `audit:${doc.id}`,
    uid: typeof data.uid === 'string' ? data.uid : undefined,
    email: typeof data.email === 'string' ? data.email : undefined,
    eventType,
    eventName: typeof data.eventName === 'string' ? data.eventName : undefined,
    platform: typeof data.platform === 'string' ? data.platform : undefined,
    timestamp: ts,
    createdAt: data.createdAt,
    details,
  };
}

function mergeLogStreams(userLogs: UserLog[], auditLogs: UserLog[]): UserLog[] {
  return [...userLogs, ...auditLogs]
    .sort((a, b) => getTimestampMs(userLogSortTime(b)) - getTimestampMs(userLogSortTime(a)))
    .slice(0, 200);
}

function poSortMs(order: PurchaseOrder): number {
  return getTimestampMs(purchaseOrderDisplayTime(order));
}

function mapPoDoc(doc: QueryDocumentSnapshot<DocumentData>): PurchaseOrder {
  const data = doc.data() as Record<string, unknown>;
  return normalizePurchaseOrder(doc.id, data);
}

function mapTxDoc(doc: QueryDocumentSnapshot<DocumentData>): IAPTransaction {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp ?? data.createdAt ?? data.verifiedAt,
    purchaseToken: data.purchaseToken ?? data.purchaseTokenHash,
  } as IAPTransaction;
}

function txSortMs(tx: IAPTransaction): number {
  return getTimestampMs(iapTransactionDisplayTime(tx));
}

function logSortMs(log: UserLog): number {
  return getTimestampMs(log.timestamp ?? log.createdAt);
}

export const useDataStore = create<DataStoreState>((set, get) => ({
  ...initialDataState,
  listenersStarted: false,

  startListeners: () => {
    if (get().listenersStarted) return;

    set({
      listenersStarted: true,
      usersLoading: true,
      usersError: null,
      userLogsLoading: true,
      userLogsError: null,
      auditLogsError: null,
      transactionsLoading: true,
      transactionsError: null,
      purchaseOrdersLoading: true,
      purchaseOrdersError: null,
      deletionFeedbackLoading: true,
      deletionFeedbackError: null,
    });

    let userLogBuf: UserLog[] = [];
    let auditLogBuf: UserLog[] = [];

    const publishMergedLogs = () => {
      const merged = mergeLogStreams(userLogBuf, auditLogBuf);
      if (import.meta.env.DEV) {
        console.info(`[LiveRadar] merged logs count=${merged.length}`);
      }
      set((state) => ({
        userLogs: merged,
        userLogsLoading: false,
        debugSnapshotSizes: {
          ...state.debugSnapshotSizes,
          userLogs: userLogBuf.length,
          auditLogs: auditLogBuf.length,
          mergedRadarLogs: merged.length,
        },
      }));
    };

    const setUserLogsStreamError = (err: unknown, label: string) => {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error(`[Firestore] ${label} read failed: ${firestoreErrCode(err)}`, err);
      set({
        userLogsError: e,
        userLogsLoading: false,
      });
    };

    const setAuditLogsStreamError = (err: unknown, label: string) => {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error(`[Firestore] ${label} read failed: ${firestoreErrCode(err)}`, err);
      set({
        auditLogsError: e,
        userLogsLoading: false,
      });
    };

    unsubscribers = [
      onSnapshot(
        collection(db, COLLECTIONS.users),
        (snapshot) => {
          const normalized = snapshot.docs.map((doc) =>
            normalizeAppUser(doc.id, doc.data() as Record<string, unknown>)
          ) as AppUser[];
          if (import.meta.env.DEV) {
            console.info(`[Users] snapshot size=${snapshot.size}`);
            console.info(`[Users] normalized count=${normalized.length}`);
          }
          set((state) => ({
            users: normalized,
            usersLoading: false,
            usersError: null,
            debugSnapshotSizes: {
              ...state.debugSnapshotSizes,
              users: snapshot.size,
            },
          }));
        },
        (error) => {
          console.error(`[Firestore] users read failed: ${firestoreErrCode(error)}`, error);
          set({
            usersError: error instanceof Error ? error : new Error(String(error)),
            usersLoading: false,
          });
        }
      ),

      subscribeCreatedAtOrFallback<UserLog>(db, COLLECTIONS.userLogs, {
        limitN: 150,
        label: 'user_logs',
        mapDocs: (docs) => {
          const rows = docs.map((d) => ({ id: d.id, ...d.data() })) as UserLog[];
          rows.sort((a, b) => logSortMs(b) - logSortMs(a));
          return rows.slice(0, 150);
        },
        onUpdate: (rows, info) => {
          userLogBuf = rows;
          if (import.meta.env.DEV) {
            console.info(`[UserLogs] snapshot size=${info.size} mode=${info.mode}`);
          }
          publishMergedLogs();
          set({ userLogsError: null });
        },
        onPermissionDenied: (err) => {
          console.error(`[Firestore] user_logs read failed: permission-denied`, err);
          userLogBuf = [];
          publishMergedLogs();
          setUserLogsStreamError(err, 'user_logs');
        },
        onFatalError: (err) => {
          userLogBuf = [];
          publishMergedLogs();
          setUserLogsStreamError(err, 'user_logs');
        },
      }),

      subscribeCreatedAtOrFallback<UserLog>(db, COLLECTIONS.auditLogs, {
        limitN: 80,
        label: 'audit_logs',
        mapDocs: (docs) => {
          const rows = docs.map((d) => mapAuditDocToUserLog(d));
          rows.sort((a, b) => logSortMs(b) - logSortMs(a));
          return rows.slice(0, 80);
        },
        onUpdate: (rows, info) => {
          auditLogBuf = rows;
          if (import.meta.env.DEV) {
            console.info(`[AuditLogs] snapshot size=${info.size} mode=${info.mode}`);
          }
          publishMergedLogs();
          set({ auditLogsError: null });
        },
        onPermissionDenied: (err) => {
          console.error(`[Firestore] audit_logs read failed: permission-denied`, err);
          auditLogBuf = [];
          publishMergedLogs();
          setAuditLogsStreamError(err, 'audit_logs');
        },
        onFatalError: (err) => {
          console.error(`[Firestore] audit_logs read failed: ${firestoreErrCode(err)}`, err);
          auditLogBuf = [];
          publishMergedLogs();
          setAuditLogsStreamError(err, 'audit_logs');
        },
      }),

      subscribeCreatedAtOrFallback<IAPTransaction>(db, COLLECTIONS.transactions, {
        limitN: 400,
        label: 'iap_transactions',
        mapDocs: (docs) => {
          const rows = docs.map((d) => mapTxDoc(d));
          rows.sort((a, b) => txSortMs(b) - txSortMs(a));
          return rows.slice(0, 400);
        },
        onUpdate: (rows, info) => {
          if (import.meta.env.DEV) {
            console.info(`[Transactions] snapshot size=${info.size} mode=${info.mode}`);
          }
          set((state) => ({
            transactions: rows,
            transactionsLoading: false,
            transactionsError: null,
            debugSnapshotSizes: {
              ...state.debugSnapshotSizes,
              transactions: rows.length,
            },
          }));
        },
        onPermissionDenied: (err) => {
          console.error(`[Firestore] iap_transactions read failed: permission-denied`, err);
          set({
            transactionsError:
              err instanceof Error ? err : new Error('iap_transactions: permission-denied'),
            transactionsLoading: false,
          });
        },
        onFatalError: (err) => {
          console.error(`[Transactions] read failed: ${firestoreErrCode(err)}`, err);
          set({
            transactionsError: err instanceof Error ? err : new Error(String(err)),
            transactionsLoading: false,
          });
        },
      }),

      subscribeCreatedAtOrFallback<PurchaseOrder>(db, COLLECTIONS.purchaseOrders, {
        limitN: 500,
        label: 'purchase_orders',
        mapDocs: (docs) => {
          const rows = docs.map((d) => mapPoDoc(d));
          rows.sort((a, b) => poSortMs(b) - poSortMs(a));
          return rows.slice(0, 500);
        },
        onUpdate: (rows, info) => {
          if (import.meta.env.DEV) {
            console.info(`[PurchaseOrders] snapshot size=${info.size} mode=${info.mode}`);
          }
          set((state) => ({
            purchaseOrders: rows,
            purchaseOrdersLoading: false,
            purchaseOrdersError: null,
            debugSnapshotSizes: {
              ...state.debugSnapshotSizes,
              purchaseOrders: rows.length,
            },
          }));
        },
        onPermissionDenied: (err) => {
          console.error(`[Firestore] purchase_orders read failed: permission-denied`, err);
          set({
            purchaseOrdersError:
              err instanceof Error ? err : new Error('purchase_orders: permission-denied'),
            purchaseOrdersLoading: false,
          });
        },
        onFatalError: (err) => {
          console.error(`[PurchaseOrders] read failed: ${firestoreErrCode(err)}`, err);
          set({
            purchaseOrdersError: err instanceof Error ? err : new Error(String(err)),
            purchaseOrdersLoading: false,
          });
        },
      }),

      onSnapshot(
        collection(db, COLLECTIONS.deletionFeedback),
        (snapshot) => {
          const deletionFeedback = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() })) as DeletionFeedback[];

          deletionFeedback.sort(
            (a, b) =>
              getTimestampMs(b.deletionDate ?? b.createdAt) -
              getTimestampMs(a.deletionDate ?? a.createdAt)
          );

          set({
            deletionFeedback,
            deletionFeedbackLoading: false,
            deletionFeedbackError: null,
          });
        },
        (error) => {
          console.error(`[Firestore] deletion_feedback read failed: ${firestoreErrCode(error)}`, error);
          set({
            deletionFeedbackError:
              error instanceof Error ? error : new Error(String(error)),
            deletionFeedbackLoading: false,
          });
        }
      ),
    ];
  },

  stopListeners: () => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe();
    }
    unsubscribers = [];
    set({ listenersStarted: false });
  },

  resetData: () => {
    set({
      ...initialDataState,
      listenersStarted: false,
    });
  },
}));
