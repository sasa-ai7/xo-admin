import type { Timestamp } from 'firebase/firestore';

export interface AdminWatchlistFolder {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdByUid: string;
  createdByEmail: string;
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
  userIds: string[];
}

/**
 * Per-user admin "charge reset" checkpoint. Displayed/monitored revenue for the
 * user is computed from purchases AFTER `resetAtMs`. Historical purchase
 * documents are never deleted — this only moves the monitoring baseline.
 */
export interface WatchlistChargeOverride {
  uid: string;
  resetAtMs: number;
  resetAt?: Timestamp | unknown;
  previousTotalUsd?: number;
  affectedPurchaseCount?: number;
  scope?: 'single_user' | 'folder' | 'all_watchlist';
  folderId?: string | null;
  resetByUid?: string;
  resetByEmail?: string;
  reason?: string | null;
}

export const FOLDER_COLORS = [
  { label: 'Orange', value: '#f97316' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Pink', value: '#ec4899' },
] as const;
