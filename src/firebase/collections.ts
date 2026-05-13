import { collection } from 'firebase/firestore';
import { db } from './config';

export const COLLECTIONS = {
  users: 'users',
  transactions: 'iap_transactions',
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
} as const;

export const usersCollection = collection(db, COLLECTIONS.users);
export const transactionsCollection = collection(db, COLLECTIONS.transactions);
export const userLogsCollection = collection(db, COLLECTIONS.userLogs);
export const deletionFeedbackCollection = collection(db, COLLECTIONS.deletionFeedback);
export const auditLogsCollection = collection(db, COLLECTIONS.auditLogs);
