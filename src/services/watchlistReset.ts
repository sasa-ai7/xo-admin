import { addDoc, collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';

export type ResetScope = 'single_user' | 'folder' | 'all_watchlist';

export interface ChargeResetTarget {
  uid: string;
  previousTotalUsd: number;
  purchaseCount: number;
}

interface ResetOptions {
  folderId?: string;
  folderName?: string;
  reason?: string;
}

function admin() {
  return { uid: auth.currentUser?.uid ?? '', email: auth.currentUser?.email ?? '' };
}

const BATCH_LIMIT = 450;

/**
 * Writes a per-user charge-reset checkpoint to `watchlist_charge_overrides` so
 * the admin-displayed/monitored revenue restarts from 0. Historical
 * purchase_orders are NOT modified or deleted. Best-effort audit log to
 * `audit_logs`. Passcode confirmation happens in the calling modal.
 */
export async function applyWatchlistChargeReset(
  scope: ResetScope,
  targets: ChargeResetTarget[],
  opts: ResetOptions = {}
): Promise<void> {
  if (targets.length === 0) throw new Error('No users to reset');
  const { uid: adminUid, email: adminEmail } = admin();
  const nowMs = Date.now();

  let totalPrev = 0;
  let totalPurchases = 0;

  // Write override checkpoints in chunks (Firestore batch limit).
  for (let i = 0; i < targets.length; i += BATCH_LIMIT) {
    const chunk = targets.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const tg of chunk) {
      totalPrev += tg.previousTotalUsd;
      totalPurchases += tg.purchaseCount;
      const ref = doc(db, COLLECTIONS.watchlistChargeOverrides, tg.uid);
      batch.set(
        ref,
        {
          uid: tg.uid,
          resetAt: serverTimestamp(),
          resetAtMs: nowMs,
          previousTotalUsd: Number(tg.previousTotalUsd.toFixed(2)),
          affectedPurchaseCount: tg.purchaseCount,
          scope,
          folderId: opts.folderId ?? null,
          resetByUid: adminUid,
          resetByEmail: adminEmail,
          reason: opts.reason ?? null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }

  // Best-effort audit log — never blocks the reset if rules deny it.
  try {
    await addDoc(collection(db, COLLECTIONS.auditLogs), {
      action: 'watchlist_charge_reset',
      scope,
      adminUid,
      adminEmail,
      targetUid: scope === 'single_user' ? targets[0]?.uid ?? null : null,
      folderId: opts.folderId ?? null,
      folderName: opts.folderName ?? null,
      previousTotalUsd: Number(totalPrev.toFixed(2)),
      newTotal: 0,
      affectedUsersCount: targets.length,
      affectedPurchaseCount: totalPurchases,
      reason: opts.reason ?? null,
      passcodeConfirmed: true,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[watchlistReset] audit log failed (non-fatal):', e);
  }
}

/** Best-effort audit log for a generated export (data egress). */
export async function logWatchlistExport(meta: {
  scope: string;
  format: string;
  folderId?: string | null;
  folderName?: string | null;
  count: number;
}): Promise<void> {
  const { uid: adminUid, email: adminEmail } = admin();
  try {
    await addDoc(collection(db, COLLECTIONS.auditLogs), {
      action: 'watchlist_export',
      adminUid,
      adminEmail,
      ...meta,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[watchlistReset] export audit log failed (non-fatal):', e);
  }
}

/** Best-effort audit log for folder lifecycle / membership events. */
export async function logWatchlistAdminAction(
  action: 'folder_created' | 'folder_renamed' | 'folder_deleted' | 'user_added' | 'user_removed',
  meta: { folderId?: string; folderName?: string; targetUid?: string; count?: number; reason?: string }
): Promise<void> {
  const { uid: adminUid, email: adminEmail } = admin();
  try {
    await addDoc(collection(db, COLLECTIONS.auditLogs), {
      action: `watchlist_${action}`,
      adminUid,
      adminEmail,
      ...meta,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[watchlistReset] admin action log failed (non-fatal):', e);
  }
}
