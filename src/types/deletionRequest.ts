export interface DeletionRequest {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string;
  reason?: string;
  feedback?: string;
  status?: string;
  reviewedAt?: unknown;
  reviewedBy?: string;
  createdAt?: unknown;
  requestedAt?: unknown;
  updatedAt?: unknown;
  /** Any other fields the mobile client may add — we read them defensively. */
  [extra: string]: unknown;
}

export interface DeletedAccountRecord {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string;
  reason?: string;
  status?: string;
  deletedAt?: unknown;
  createdAt?: unknown;
  finalBalance?: number;
  totalGames?: number;
  [extra: string]: unknown;
}
