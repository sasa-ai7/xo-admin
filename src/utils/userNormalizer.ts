import type {
  AppUser,
  UserCosmetics,
  UserProfile,
  UserSession,
  UserSettings,
  UserStats,
  UserStatusBlock,
  UserWallet,
} from '../types/user';
import { getUserLastSeenValue, isUserOnline } from './userPresence';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as UnknownRecord;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const picked = asFiniteNumber(value);
    if (picked !== undefined) return picked;
  }
  return undefined;
}

function normalizeProfile(raw: UnknownRecord): UserProfile | undefined {
  const profile = asRecord(raw.Profile) ?? asRecord(raw.profile) ?? {};

  const normalized: UserProfile = {
    email: asString(profile.email) ?? asString(raw.email),
    displayName:
      asString(profile.displayName) ??
      asString(profile.display_name) ??
      asString(raw.displayName),
    name: asString(profile.name) ?? asString(raw.name),
    photoURL:
      asString(profile.photoURL) ??
      asString(profile.photoUrl) ??
      asString(raw.photoURL),
    provider: asString(profile.provider) ?? asString(raw.provider),
    age: pickNumber(profile.age, profile.Age, raw.age),
    birthDate: asString(profile.birthDate) ?? asString(profile.birth_date),
    characterType:
      asString(profile.characterType) ??
      asString(profile.character_type) ??
      asString(profile.character),
    gender: asString(profile.gender) ?? asString(profile.sex),
    lastLoginAt: profile.lastLoginAt ?? profile.last_login_at ?? raw.lastLoginAt,
    createdAt: profile.createdAt ?? profile.created_at ?? raw.createdAt,
  };

  if (
    !normalized.email &&
    !normalized.displayName &&
    !normalized.name &&
    !normalized.photoURL &&
    !normalized.provider &&
    normalized.age === undefined &&
    !normalized.birthDate &&
    !normalized.characterType &&
    !normalized.gender &&
    normalized.lastLoginAt === undefined &&
    normalized.createdAt === undefined
  ) {
    return undefined;
  }

  return normalized;
}

function normalizeWallet(raw: UnknownRecord): UserWallet | undefined {
  const wallet = asRecord(raw.Wallet) ?? asRecord(raw.wallet) ?? {};
  const coins = pickNumber(wallet.coins, raw.coins);
  const updatedAt = wallet.updatedAt ?? wallet.updated_at;
  const totalSpent = pickNumber(wallet.totalSpent, wallet.TotalSpent, raw.totalSpent);
  const purchasesCount = pickNumber(
    wallet.purchasesCount,
    wallet.PurchasesCount,
    raw.purchasesCount
  );
  if (
    coins === undefined &&
    updatedAt === undefined &&
    totalSpent === undefined &&
    purchasesCount === undefined
  ) {
    return undefined;
  }
  const out: UserWallet = {};
  if (coins !== undefined) out.coins = coins;
  if (updatedAt !== undefined) out.updatedAt = updatedAt;
  if (totalSpent !== undefined) out.totalSpent = totalSpent;
  if (purchasesCount !== undefined) out.purchasesCount = purchasesCount;
  return out;
}

function normalizeStats(raw: UnknownRecord): UserStats | undefined {
  const stats = asRecord(raw.Stats) ?? asRecord(raw.stats) ?? {};

  const normalized: UserStats = {
    gamesPlayed: pickNumber(stats.gamesPlayed, stats.matches, raw.gamesPlayed, raw.matches),
    gamesWon: pickNumber(
      stats.gamesWon,
      stats.wins,
      stats.games_won,
      raw.gamesWon,
      raw.wins
    ),
    gamesLost: pickNumber(
      stats.gamesLost,
      stats.losses,
      stats.games_lost,
      raw.gamesLost,
      raw.losses
    ),
    gamesDrawn: pickNumber(
      stats.gamesDrawn,
      stats.draws,
      stats.games_drawn,
      raw.gamesDrawn,
      raw.draws
    ),
    currentLevel: pickNumber(
      stats.currentLevel,
      stats.level,
      raw.currentLevel,
      raw.level,
      raw.levelGameCurrentLevel
    ),
    maxLevel: pickNumber(stats.maxLevel, raw.maxLevel, raw.levelGameMaxLevel),
  };

  if (
    normalized.gamesPlayed === undefined &&
    normalized.gamesWon === undefined &&
    normalized.gamesLost === undefined &&
    normalized.gamesDrawn === undefined &&
    normalized.currentLevel === undefined &&
    normalized.maxLevel === undefined
  ) {
    return undefined;
  }

  return normalized;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return out.length ? out : undefined;
}

function normalizeCosmetics(raw: UnknownRecord): UserCosmetics | undefined {
  const c = asRecord(raw.Cosmetics) ?? asRecord(raw.cosmetics) ?? {};
  const normalized: UserCosmetics = {
    equippedAvatar: asString(c.equippedAvatar) ?? asString(c.equipped_avatar),
    ownedAvatars: asStringArray(c.ownedAvatars ?? c.owned_avatars),
    selectedXSkin: asString(c.selectedXSkin) ?? asString(c.selected_x_skin) ?? asString(c.xSkin),
    selectedOSkin: asString(c.selectedOSkin) ?? asString(c.selected_o_skin) ?? asString(c.oSkin),
    ownedXSkins: asStringArray(c.ownedXSkins ?? c.owned_x_skins),
    ownedOSkins: asStringArray(c.ownedOSkins ?? c.owned_o_skins),
  };

  if (
    !normalized.equippedAvatar &&
    !normalized.ownedAvatars &&
    !normalized.selectedXSkin &&
    !normalized.selectedOSkin &&
    !normalized.ownedXSkins &&
    !normalized.ownedOSkins
  ) {
    return undefined;
  }
  return normalized;
}

function normalizeSettings(raw: UnknownRecord): UserSettings | undefined {
  const s = asRecord(raw.Settings) ?? asRecord(raw.settings);
  if (!s || Object.keys(s).length === 0) return undefined;
  return { ...s };
}

function normalizeSession(raw: UnknownRecord): UserSession | undefined {
  const s = asRecord(raw.Session) ?? asRecord(raw.session);
  if (!s || Object.keys(s).length === 0) return undefined;
  return { ...s };
}

function normalizeStatusBlock(raw: UnknownRecord): UserStatusBlock | undefined {
  const s = asRecord(raw.Status) ?? asRecord(raw.status) ?? {};
  const block: UserStatusBlock = {
    online: asBoolean(s.online) ?? asBoolean(s.isOnline),
    lastSeen: s.lastSeen ?? s.last_seen,
    deleted: asBoolean(s.deleted) ?? asBoolean(s.isDeleted),
    banned: asBoolean(s.banned),
    suspended: asBoolean(s.suspended),
    verified: asBoolean(s.verified),
    watchlisted: asBoolean(s.watchlisted),
  };
  if (
    block.online === undefined &&
    block.lastSeen === undefined &&
    block.deleted === undefined &&
    block.banned === undefined &&
    block.suspended === undefined &&
    block.verified === undefined &&
    block.watchlisted === undefined
  ) {
    return undefined;
  }
  return block;
}

export function normalizeAppUser(id: string, data: UnknownRecord): AppUser {
  const profile = normalizeProfile(data);
  const wallet = normalizeWallet(data);
  const stats = normalizeStats(data);
  const cosmetics = normalizeCosmetics(data);
  const settings = normalizeSettings(data);
  const session = normalizeSession(data);
  const statusBlock = normalizeStatusBlock(data);

  const purchasesCount = pickNumber(
    data.purchasesCount,
    data.PurchasesCount,
    wallet?.purchasesCount
  );

  const candidate = {
    ...data,
    id,
    Profile: profile,
    Wallet: wallet,
    Stats: stats,
    Cosmetics: cosmetics,
    Settings: settings,
    Session: session,
    Status: statusBlock,
    purchasesCount,
  } as UnknownRecord & { id: string };

  const authUid =
    asString(data.uid) ??
    asString(asRecord(data.Profile)?.uid) ??
    id;

  const normalized: AppUser = {
    id,
    uid: authUid,
    Profile: profile,
    Wallet: wallet,
    Stats: stats,
    Cosmetics: cosmetics,
    Settings: settings,
    Session: session,
    Status: statusBlock,
    purchasesCount,
    online: isUserOnline(candidate),
    lastSeen: getUserLastSeenValue(candidate),
    createdAt: data.createdAt ?? asRecord(data.Profile)?.createdAt,
    deleted:
      asBoolean(data.deleted) ??
      asBoolean(data.isDeleted) ??
      statusBlock?.deleted,
    banned: asBoolean(data.banned) ?? statusBlock?.banned,
    banReason: asString(data.banReason),
    suspended: asBoolean(data.suspended) ?? statusBlock?.suspended,
    suspendReason: asString(data.suspendReason),
    isPremium: asBoolean(data.isPremium) ?? asBoolean(asRecord(data.Profile)?.premium),
    verified:
      asBoolean(data.verified) ??
      asBoolean(asRecord(data.Profile)?.verified) ??
      statusBlock?.verified,
    watchlisted: asBoolean(data.watchlisted) ?? statusBlock?.watchlisted,
  };

  return normalized;
}
