import { useFirestoreCollection } from './useFirestoreCollection';
import { COLLECTIONS } from '../firebase/collections';
import type { ReferralCode } from '../types/referral';

export function useReferralCodes() {
  return useFirestoreCollection<ReferralCode>(COLLECTIONS.referralCodes);
}
