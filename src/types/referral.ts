export interface ReferralCode {
  id: string;
  code?: string;
  ownerUid: string;
  ownerEmail?: string;
  usageCount?: number;
  maxUses?: number;
  rewardCoins?: number;
  active?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Referral {
  id: string;
  inviteeUid: string;
  inviteeEmail?: string;
  referrerUid?: string;
  referrerEmail?: string;
  referralCode?: string;
  status?: 'pending' | 'completed' | 'rewarded';
  createdAt?: unknown;
  completedAt?: unknown;
}

export interface PendingReferralReward {
  id: string;
  uid?: string;
  email?: string;
  referralCode?: string;
  rewardType?: string;
  rewardAmount?: number;
  status?: 'pending' | 'claimed' | 'expired';
  createdAt?: unknown;
  claimedAt?: unknown;
  expiresAt?: unknown;
}
