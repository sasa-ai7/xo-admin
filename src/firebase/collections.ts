import { collection } from 'firebase/firestore';
import { db } from './config';

export const COLLECTIONS = {
  users: 'users',
  transactions: 'iap_transactions',
  purchaseOrders: 'purchase_orders',
  userLogs: 'user_logs',
  deletionFeedback: 'deletion_feedback',
  auditLogs: 'audit_logs',
  deletionRequests: 'deletion_requests',
  deletedAccounts: 'deleted_accounts',
  matchRewards: 'match_rewards',
  avatars: 'avatars',
  xSkins: 'x_skins',
  oSkins: 'o_skins',
  storeItems: 'store_items',
  leaderboard: 'leaderboard',
  onlineRoomHistory: 'online_room_history',
  referralCodes: 'referral_codes',
  referrals: 'referrals',
  pendingReferralRewards: 'pending_referral_rewards',
  roomArchives: 'room_archives',
  adminWatchlists: 'admin_watchlists',
  watchlistChargeOverrides: 'watchlist_charge_overrides',
} as const;

/** User subcollection path keys (used with collection(db, COLLECTIONS.users, uid, key)) */
export const USER_SUBCOLLECTIONS = {
  walletLedger: 'wallet_ledger',
  ownedAvatars: 'ownedAvatars',
  purchaseCounts: 'purchase_counts',
  transactions: 'transactions',
} as const;

export const RTDB_PATHS = {
  rooms: 'rooms',
} as const;

export const usersCollection = collection(db, COLLECTIONS.users);
export const purchaseOrdersCollection = collection(db, COLLECTIONS.purchaseOrders);
export const transactionsCollection = collection(db, COLLECTIONS.transactions);
export const userLogsCollection = collection(db, COLLECTIONS.userLogs);
export const deletionFeedbackCollection = collection(db, COLLECTIONS.deletionFeedback);
export const auditLogsCollection = collection(db, COLLECTIONS.auditLogs);
export const deletionRequestsCollection = collection(db, COLLECTIONS.deletionRequests);
export const deletedAccountsCollection = collection(db, COLLECTIONS.deletedAccounts);
export const onlineRoomHistoryCollection = collection(db, COLLECTIONS.onlineRoomHistory);
export const referralCodesCollection = collection(db, COLLECTIONS.referralCodes);
export const referralsCollection = collection(db, COLLECTIONS.referrals);
export const pendingReferralRewardsCollection = collection(db, COLLECTIONS.pendingReferralRewards);
export const roomArchivesCollection = collection(db, COLLECTIONS.roomArchives);
export const adminWatchlistsCollection = collection(db, COLLECTIONS.adminWatchlists);
export const watchlistChargeOverridesCollection = collection(db, COLLECTIONS.watchlistChargeOverrides);
