export interface IAPTransaction {
  id: string;
  uid?: string;
  email?: string;
  orderId?: string;
  productId?: string;
  purchaseToken?: string;
  /** Some backends store the hashed token as document id only; others expose this field. */
  purchaseTokenHash?: string;
  coinsAdded?: number;
  balanceBefore?: number;
  balanceAfter?: number;
  /** Legacy / alternate sort keys */
  timestamp?: unknown;
  createdAt?: unknown;
  verifiedAt?: unknown;
  amount?: number;
  /** Some providers store monetary value under `price`. */
  price?: number;
  currency?: string;
  status?: string;
  provider?: string;
}

/** Prefer explicit `timestamp`, then common new-game fields. */
export function iapTransactionDisplayTime(tx: IAPTransaction): unknown {
  return tx.timestamp ?? tx.createdAt ?? tx.verifiedAt;
}
