export interface UserProfile {
  email?: string;
  displayName?: string;
  name?: string;
  photoURL?: string;
  provider?: string;
  age?: number;
  birthDate?: string;
  characterType?: string;
  gender?: string;
  /** Presence / account timeline (nested or legacy). */
  lastLoginAt?: unknown;
  createdAt?: unknown;
}

export interface UserWallet {
  coins?: number;
  updatedAt?: unknown;
  totalSpent?: number;
  purchasesCount?: number;
}

export interface UserStats {
  gamesPlayed?: number;
  gamesWon?: number;
  gamesLost?: number;
  gamesDrawn?: number;
  currentLevel?: number;
  maxLevel?: number;
}

export interface UserCosmetics {
  equippedAvatar?: string;
  ownedAvatars?: string[];
  selectedXSkin?: string;
  selectedOSkin?: string;
  ownedXSkins?: string[];
  ownedOSkins?: string[];
}

export interface UserSettings {
  [key: string]: unknown;
}

export interface UserSession {
  [key: string]: unknown;
}

/** Nested status block (new game) — fields may also exist at document root (legacy). */
export interface UserStatusBlock {
  online?: boolean;
  lastSeen?: unknown;
  deleted?: boolean;
  banned?: boolean;
  suspended?: boolean;
  verified?: boolean;
  watchlisted?: boolean;
}

export interface AppUser {
  id: string;
  /** Firebase Auth UID — may differ from the Firestore doc ID. */
  uid?: string;
  Profile?: UserProfile;
  Wallet?: UserWallet;
  Stats?: UserStats;
  Cosmetics?: UserCosmetics;
  Settings?: UserSettings;
  Session?: UserSession;
  Status?: UserStatusBlock;
  /** Root-level purchase counters sometimes stored outside Wallet. */
  purchasesCount?: number;
  online?: boolean;
  lastSeen?: unknown;
  createdAt?: unknown;
  deleted?: boolean;
  banned?: boolean;
  banReason?: string;
  suspended?: boolean;
  suspendReason?: string;
  isPremium?: boolean;
  verified?: boolean;
  watchlisted?: boolean;
}
