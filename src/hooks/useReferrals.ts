import { useFirestoreCollection } from './useFirestoreCollection';
import { COLLECTIONS } from '../firebase/collections';
import type { Referral } from '../types/referral';

export function useReferrals() {
  return useFirestoreCollection<Referral>(COLLECTIONS.referrals);
}
