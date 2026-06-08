export interface PurchaseOrder {
  id: string;
  uid?: string;
  email?: string | null;
  displayName?: string | null;
  userEmailSnapshot?: string | null;
  userDisplayNameSnapshot?: string | null;
  userPhotoUrlSnapshot?: string | null;

  productId?: string;
  productType?: 'coins' | 'avatar' | string;
  platform?: 'android' | 'ios' | string;
  source?: string;

  status?: string;
  verified?: boolean;
  trustedRevenue?: boolean;

  // Coin fields — prefer coinsGranted (new Flutter field), fall back to coinsAdded/coins
  coinsGranted?: number;
  coins?: number;
  coinsAdded?: number;
  balanceBefore?: number;
  balanceAfter?: number;

  avatarId?: number | string;
  avatarAsset?: string;

  orderId?: string;
  purchaseTokenHash?: string;
  purchaseToken?: never;
  rawPurchaseToken?: never;

  // Admin accounting (normalized): 2000 coins = $1 USD
  coinsPerUsd?: number;
  normalizedUsd?: number;
  normalizedUsdCents?: number;
  adminRevenueUsd?: number;

  // Google Play actual payment fields (kept separately — not used for accounting)
  googlePlayPriceLabel?: string;
  googlePlayCurrencyCode?: string;
  googlePlayPriceAmountMicros?: number;
  // Legacy payment fields
  currencyCode?: string;
  priceAmountMicros?: number;
  price?: number;
  amount?: number;

  createdAt?: unknown;
  updatedAt?: unknown;
  purchasedAt?: unknown;
  verifiedAt?: unknown;
  grantedAt?: unknown;

  appVersion?: string;
  deviceId?: string;
  buildNumber?: string;

  error?: string | null;
  errorCode?: string | null;

  [key: string]: unknown;
}

/** Admin accounting rule: 2000 coins = $1 USD. Never estimate from wallet balance. */
export const COINS_PER_USD = 2000;

/** Statuses that represent real money events (purchased_client_reported or later). */
export const REAL_PURCHASE_STATUSES = new Set([
  'purchased_client_reported',
  'purchase_client_reported',
  'purchase_completed',
  'grant_success',
  'already_processed',
  'avatar_unlock_success',
  'verification_failed',
  'grant_failed',
  'coin_granted_client_fallback',
]);

/** Noise/debug statuses that should be hidden by default. */
export const NOISE_PURCHASE_STATUSES = new Set([
  'started',
  'canceled',
  'pending',
  'pre_purchase_error',
  'open_store',
  'tap_product',
]);

/** Statuses that indicate coins were actually granted to the user. */
const REVENUE_GRANT_STATUSES = new Set([
  'grant_success',
  'avatar_unlock_success',
  'coin_granted_client_fallback',
  'purchase_completed',
  'purchase_client_reported',
  'purchased_client_reported',
]);

export function isRealPurchaseOrder(order: PurchaseOrder): boolean {
  const s = order.status ?? '';
  return REAL_PURCHASE_STATUSES.has(s);
}

/**
 * Returns true if this purchase order should count toward normalized revenue.
 * Requires: a status indicating coins were granted, coins > 0, and a stable
 * transaction identity (orderId or purchaseTokenHash). Never estimates from balance.
 */
export function shouldCountForRevenue(order: PurchaseOrder): boolean {
  const s = order.status ?? '';
  if (!REVENUE_GRANT_STATUSES.has(s)) return false;
  if (purchaseOrderCoins(order) <= 0) return false;
  return Boolean(order.orderId?.trim()) || Boolean(order.purchaseTokenHash?.trim());
}

export function isNoisePurchaseOrder(order: PurchaseOrder): boolean {
  if (shouldCountForRevenue(order)) return false;
  const s = order.status ?? '';
  return NOISE_PURCHASE_STATUSES.has(s) || (!REAL_PURCHASE_STATUSES.has(s) && s.length > 0);
}

export function purchaseOrderDisplayTime(order: PurchaseOrder): unknown {
  return order.createdAt ?? order.purchasedAt ?? order.grantedAt ?? order.verifiedAt ?? order.updatedAt;
}

export function purchaseOrderCoins(order: PurchaseOrder): number {
  const v = order.coinsGranted ?? order.coinsAdded ?? order.coins ?? 0;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Normalized accounting revenue: always coins / 2000.
 * Uses pre-computed field if present, falls back to coin calculation.
 * Never estimates from wallet balance.
 */
export function purchaseOrderNormalizedUsd(order: PurchaseOrder): number {
  if (typeof order.normalizedUsd === 'number' && order.normalizedUsd > 0) return order.normalizedUsd;
  if (typeof order.adminRevenueUsd === 'number' && order.adminRevenueUsd > 0) return order.adminRevenueUsd;
  const coins = purchaseOrderCoins(order);
  if (coins > 0) return coins / COINS_PER_USD;
  return 0;
}

export function purchaseOrderRevenue(order: PurchaseOrder): number | null {
  const direct = order.amount ?? order.price;
  if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) return direct;
  if (typeof order.priceAmountMicros === 'number' && order.priceAmountMicros > 0) {
    return order.priceAmountMicros / 1_000_000;
  }
  return null;
}

/** Safe normalize: masks sensitive fields, ensures id is set. */
export function normalizePurchaseOrder(id: string, data: Record<string, unknown>): PurchaseOrder {
  const masked: Record<string, unknown> = { ...data, id };

  if ('purchaseToken' in masked) {
    if (import.meta.env.DEV) {
      console.warn(`[PurchaseOrder] doc ${id} contains raw purchaseToken — masking`);
    }
    masked.purchaseToken = '[hidden]';
  }
  if ('rawPurchaseToken' in masked) {
    if (import.meta.env.DEV) {
      console.warn(`[PurchaseOrder] doc ${id} contains rawPurchaseToken — masking`);
    }
    masked.rawPurchaseToken = '[hidden]';
  }

  return masked as PurchaseOrder;
}
