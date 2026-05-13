export const ONLINE_FALLBACK_WINDOW_MS = 5 * 60 * 1000;

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  return value as UnknownRecord;
}

export function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate(): Date }).toDate().getTime();
    } catch {
      return 0;
    }
  }
  return 0;
}

export function getUserLastSeenValue(user?: unknown | null): unknown {
  const source = asRecord(user);
  if (!source) return null;

  const profile = asRecord(source.Profile);
  const session = asRecord(source.Session);
  const presence = asRecord(source.presence);
  const status = asRecord(source.Status);

  return (
    source.lastSeen ??
    source.last_seen ??
    source.lastActive ??
    source.last_active ??
    source.lastLoginAt ??
    profile?.lastLoginAt ??
    profile?.lastLoginTime ??
    session?.lastLoginTime ??
    session?.lastLoginAt ??
    presence?.lastSeen ??
    presence?.last_seen ??
    status?.lastSeen ??
    status?.last_seen ??
    null
  );
}

export function isUserOnline(user?: unknown | null, now = Date.now()): boolean {
  const source = asRecord(user);
  if (!source) return false;

  const presence = asRecord(source.presence);
  const status = asRecord(source.Status);
  const explicitOnline =
    source.online === true ||
    source.isOnline === true ||
    source.is_online === true ||
    presence?.online === true ||
    presence?.isOnline === true ||
    status?.online === true ||
    status?.isOnline === true;

  if (explicitOnline) return true;

  const lastSeenMs = toMs(getUserLastSeenValue(source));
  if (!lastSeenMs) return false;

  return now - lastSeenMs <= ONLINE_FALLBACK_WINDOW_MS;
}
