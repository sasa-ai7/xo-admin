import type { ArenaRoom, RoomPlayerEntry } from '../types/room';
import type { AppUser } from '../types/user';

export interface ResolvedAvatar {
  photoURL?: string;
  name?: string;
  equippedAvatar?: string;
}

function firstString(...candidates: Array<unknown>): string | undefined {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c;
  }
  return undefined;
}

function getRoomPlayer(room: ArenaRoom, uid?: string): RoomPlayerEntry | undefined {
  if (!uid || !room.players) return undefined;
  const direct = room.players[uid];
  if (direct) return direct;
  // Some payloads key by player slot, not uid. Search by uid match.
  for (const entry of Object.values(room.players)) {
    if (entry && entry.uid === uid) return entry;
  }
  return undefined;
}

function getAppUser(users: Map<string, AppUser> | undefined, uid?: string): AppUser | undefined {
  if (!users || !uid) return undefined;
  return users.get(uid);
}

/**
 * Avatar priority chain for room host:
 *   room.hostPhotoURL → room.hostPhoto → room.players[hostUid].photoURL
 *   → users[hostUid].Profile.photoURL → users[hostUid].photo (legacy) → fallback initial.
 */
export function resolveRoomHostAvatar(
  room: ArenaRoom,
  users?: Map<string, AppUser>
): ResolvedAvatar {
  const uid = room.hostUid;
  const roomPlayer = getRoomPlayer(room, uid);
  const appUser = getAppUser(users, uid);
  const photoURL = firstString(
    room.hostPhotoURL,
    room.hostPhoto,
    roomPlayer?.photoURL,
    roomPlayer?.photo,
    appUser?.Profile?.photoURL,
    (appUser as unknown as { photo?: string } | undefined)?.photo
  );
  const name = firstString(
    room.hostName,
    roomPlayer?.displayName,
    roomPlayer?.name,
    appUser?.Profile?.displayName,
    appUser?.Profile?.name,
    appUser?.Profile?.email,
    uid
  );
  const equippedAvatar = firstString(appUser?.Cosmetics?.equippedAvatar);
  return { photoURL, name, equippedAvatar };
}

export function resolveRoomGuestAvatar(
  room: ArenaRoom,
  users?: Map<string, AppUser>
): ResolvedAvatar {
  const uid = room.guestUid;
  if (!uid) return { name: 'Waiting for opponent' };
  const roomPlayer = getRoomPlayer(room, uid);
  const appUser = getAppUser(users, uid);
  const photoURL = firstString(
    room.guestPhotoURL,
    room.guestPhoto,
    roomPlayer?.photoURL,
    roomPlayer?.photo,
    appUser?.Profile?.photoURL,
    (appUser as unknown as { photo?: string } | undefined)?.photo
  );
  const name = firstString(
    room.guestName,
    roomPlayer?.displayName,
    roomPlayer?.name,
    appUser?.Profile?.displayName,
    appUser?.Profile?.name,
    appUser?.Profile?.email,
    uid
  );
  const equippedAvatar = firstString(appUser?.Cosmetics?.equippedAvatar);
  return { photoURL, name, equippedAvatar };
}

/** Build a lookup map of users keyed by uid (preferring AppUser.id, then uid). */
export function usersById(users: AppUser[]): Map<string, AppUser> {
  const map = new Map<string, AppUser>();
  for (const u of users) {
    if (u.id) map.set(u.id, u);
    if (u.uid && !map.has(u.uid)) map.set(u.uid, u);
  }
  return map;
}

export function shortUid(uid?: string | null, head = 5, tail = 4): string {
  if (!uid) return '—';
  const s = String(uid);
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}
