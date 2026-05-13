import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, type Query } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();
const authAdmin = getAuth();

const COLLECTIONS = {
  users: 'users',
  iap_transactions: 'iap_transactions',
  user_logs: 'user_logs',
  deletion_feedback: 'deletion_feedback',
  deletion_requests: 'deletion_requests',
  deleted_accounts: 'deleted_accounts',
  audit_logs: 'audit_logs',
} as const;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? '').trim();

async function deleteQueryInChunks(baseQuery: Query, batchSize: number): Promise<number> {
  let deleted = 0;
  while (true) {
    const snap = await baseQuery.limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    deleted += snap.docs.length;
    if (snap.docs.length < batchSize) break;
  }
  return deleted;
}

async function deleteUserSubcollections(uid: string): Promise<void> {
  const userRef = db.collection(COLLECTIONS.users).doc(uid);
  const subcols = await userRef.listCollections();
  for (const col of subcols) {
    const snaps = await col.get();
    for (const d of snaps.docs) {
      await d.ref.delete();
    }
  }
}

export const adminDeleteUserWithCleanup = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    const token = request.auth.token;
    const email = (token.email as string | undefined)?.trim();
    const isClaimAdmin = token.admin === true;
    const isEmailAdmin =
      Boolean(ADMIN_EMAIL && email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase());

    if (!isClaimAdmin && !isEmailAdmin) {
      throw new HttpsError('permission-denied', 'Not authorized for admin delete.');
    }

    const data = request.data as {
      targetUserUid?: string;
      deleteUserLogs?: boolean;
      deleteDeletedAccountRecords?: boolean;
    };

    const targetUserUid = String(data.targetUserUid ?? '').trim();
    if (!targetUserUid) {
      throw new HttpsError('invalid-argument', 'targetUserUid is required');
    }

    const deleteUserLogs = data.deleteUserLogs !== false;
    const deleteDeletedAccountRecords = data.deleteDeletedAccountRecords === true;

    let deletedTransactions = 0;

    try {
      deletedTransactions += await deleteQueryInChunks(
        db.collection(COLLECTIONS.iap_transactions).where('uid', '==', targetUserUid),
        400
      );

      if (deleteUserLogs) {
        await deleteQueryInChunks(
          db.collection(COLLECTIONS.user_logs).where('uid', '==', targetUserUid),
          400
        );
      }

      await db.collection(COLLECTIONS.deletion_feedback).doc(targetUserUid).delete().catch(() => undefined);
      await db.collection(COLLECTIONS.deletion_requests).doc(targetUserUid).delete().catch(() => undefined);

      if (deleteDeletedAccountRecords) {
        await deleteQueryInChunks(
          db.collection(COLLECTIONS.deleted_accounts).where('uid', '==', targetUserUid),
          400
        );
        await db.collection(COLLECTIONS.deleted_accounts).doc(targetUserUid).delete().catch(() => undefined);
      }

      await deleteUserSubcollections(targetUserUid);
      await db.collection(COLLECTIONS.users).doc(targetUserUid).delete().catch(() => undefined);

      try {
        await authAdmin.deleteUser(targetUserUid);
      } catch (e: unknown) {
        const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: string }).code) : '';
        if (code !== 'auth/user-not-found') {
          throw e;
        }
      }

      await db.collection(COLLECTIONS.audit_logs).add({
        type: 'admin_delete_user',
        targetUid: targetUserUid,
        adminEmail: email ?? null,
        deleteUserLogs,
        deleteDeletedAccountRecords,
        createdAt: FieldValue.serverTimestamp(),
      });

      return {
        ok: true as const,
        targetUserUid,
        deletedTransactions,
        deletedUser: true as const,
      };
    } catch (e) {
      logger.error('adminDeleteUserWithCleanup failed', e);
      if (e instanceof HttpsError) throw e;
      const message = e instanceof Error ? e.message : 'Delete failed';
      throw new HttpsError('internal', message);
    }
  }
);
