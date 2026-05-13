export interface UserLogDetails {
  entryFee?: number;
  matchType?: string;
  result?: string;
  level?: number | string;
  difficulty?: string;
  orderId?: string;
  coinsAdded?: number | string;
  productId?: string;
  balanceBefore?: number | string;
  balanceAfter?: number | string;
  provider?: string;
  [key: string]: unknown;
}

export interface UserLog {
  id: string;
  email?: string;
  eventType?: string;
  platform?: string;
  timestamp?: unknown;
  /** New-game logs may sort on `createdAt` instead of `timestamp`. */
  createdAt?: unknown;
  uid?: string;
  userAgent?: string;
  /** Raw audit_logs field when present (also mapped into eventType). */
  eventName?: string;
  details?: UserLogDetails;
}
