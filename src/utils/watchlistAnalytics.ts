import {
  type PurchaseOrder,
  purchaseOrderCoins,
  purchaseOrderNormalizedUsd,
  purchaseOrderDisplayTime,
  isRealPurchaseOrder,
} from '../types/purchaseOrder';
import { toMs } from './relativeTime';
import type { WatchlistChargeOverride } from '../types/watchlist';

export interface UserChargeSummary {
  /** All-time normalized revenue (USD) from real purchases. */
  historicalUsd: number;
  /** Revenue counted after the admin reset checkpoint (or = historical if none). */
  displayedUsd: number;
  historicalCoins: number;
  displayedCoins: number;
  realCount: number;
  /** Count of real purchases that pre-date the reset checkpoint. */
  beforeResetCount: number;
  lastPurchaseMs: number;
  failedCount: number;
  resetAtMs: number | null;
}

/**
 * Computes historical vs. displayed (post-reset-checkpoint) charge totals for a
 * single user. Historical = all real purchases; displayed = real purchases with
 * a display time strictly after the reset checkpoint.
 */
export function computeUserCharge(
  orders: PurchaseOrder[],
  override?: WatchlistChargeOverride | null
): UserChargeSummary {
  const resetAtMs = override?.resetAtMs ?? null;
  let historicalUsd = 0;
  let displayedUsd = 0;
  let historicalCoins = 0;
  let displayedCoins = 0;
  let realCount = 0;
  let beforeResetCount = 0;
  let lastPurchaseMs = 0;
  let failedCount = 0;

  for (const o of orders) {
    const status = o.status ?? '';
    if (status === 'verification_failed' || status === 'grant_failed') failedCount++;
    if (!isRealPurchaseOrder(o)) continue;
    const usd = purchaseOrderNormalizedUsd(o);
    const coins = purchaseOrderCoins(o);
    const ms = toMs(purchaseOrderDisplayTime(o)) ?? 0;
    realCount++;
    historicalUsd += usd;
    historicalCoins += coins;
    if (ms > lastPurchaseMs) lastPurchaseMs = ms;
    if (resetAtMs != null && ms <= resetAtMs) {
      beforeResetCount++;
    } else {
      displayedUsd += usd;
      displayedCoins += coins;
    }
  }

  if (resetAtMs == null) {
    displayedUsd = historicalUsd;
    displayedCoins = historicalCoins;
  }

  return {
    historicalUsd,
    displayedUsd,
    historicalCoins,
    displayedCoins,
    realCount,
    beforeResetCount,
    lastPurchaseMs,
    failedCount,
    resetAtMs,
  };
}

/** True when this order pre-dates the user's reset checkpoint. */
export function isBeforeReset(order: PurchaseOrder, override?: WatchlistChargeOverride | null): boolean {
  if (!override?.resetAtMs) return false;
  const ms = toMs(purchaseOrderDisplayTime(order)) ?? 0;
  return ms > 0 && ms <= override.resetAtMs;
}

/** Lightweight suspicious heuristic for monitoring flags. */
export function isSuspiciousUser(opts: {
  banned?: boolean;
  suspended?: boolean;
  watchlisted?: boolean;
  failedCount: number;
  deleted?: boolean;
}): boolean {
  return Boolean(opts.banned || opts.suspended || opts.deleted || opts.failedCount >= 2);
}
