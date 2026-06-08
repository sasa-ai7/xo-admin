import { useFirestoreCollection } from './useFirestoreCollection';
import { COLLECTIONS } from '../firebase/collections';
import type { PendingReferralReward } from '../types/referral';

export function usePendingReferralRewards() {
  return useFirestoreCollection<PendingReferralReward>(COLLECTIONS.pendingReferralRewards);
}
