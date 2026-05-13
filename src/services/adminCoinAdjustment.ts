import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';

function walletCoinsFromUserData(data: Record<string, unknown> | undefined): number {
  if (!data) return 0;
  const wallet = data.Wallet;
  if (typeof wallet === 'object' && wallet !== null && 'coins' in wallet) {
    const c = (wallet as { coins?: unknown }).coins;
    if (typeof c === 'number' && Number.isFinite(c)) return c;
  }
  const root = data.coins;
  if (typeof root === 'number' && Number.isFinite(root)) return root;
  return 0;
}

export interface AdminCoinAdjustmentParams {
  userId: string;
  /** Positive adds coins; negative removes. */
  delta: number;
  reason?: string | null;
}

export interface AdminCoinAdjustmentResult {
  before: number;
  after: number;
  delta: number;
}

/**
 * Reads current Wallet.coins, applies delta with balance >= 0, sets Wallet.updatedAt,
 * and appends an audit_logs document in the same transaction.
 */
export async function applyAdminCoinAdjustment(
  params: AdminCoinAdjustmentParams
): Promise<AdminCoinAdjustmentResult> {
  const { userId, delta } = params;
  if (!userId) {
    throw new Error('userId is required');
  }
  if (!Number.isFinite(delta) || delta === 0) {
    throw new Error('delta must be a non-zero finite number');
  }

  const adminEmail =
    auth.currentUser?.email?.trim() ||
    (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() ||
    null;

  const userRef = doc(db, COLLECTIONS.users, userId);
  const auditCol = collection(db, COLLECTIONS.auditLogs);

  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef);
    if (!snap.exists()) {
      throw new Error('User not found');
    }

    const data = snap.data() as Record<string, unknown>;
    const before = walletCoinsFromUserData(data);
    const after = before + delta;

    if (after < 0) {
      throw new Error('Cannot reduce coins below 0');
    }

    transaction.update(userRef, {
      'Wallet.coins': after,
      'Wallet.updatedAt': serverTimestamp(),
    });

    const auditRef = doc(auditCol);
    transaction.set(auditRef, {
      type: 'admin_coin_adjustment',
      uid: userId,
      adminEmail,
      before,
      after,
      delta,
      reason: params.reason ?? null,
      createdAt: serverTimestamp(),
    });

    return { before, after, delta };
  });
}
