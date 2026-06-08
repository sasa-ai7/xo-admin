import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTIONS } from '../firebase/collections';

const cache = new Map<string, string | null>();

export function useAvatarUrl(avatarIdOrUrl: string | undefined | null): string | null {
  const immediateUrl = !avatarIdOrUrl
    ? null
    : avatarIdOrUrl.startsWith('http')
      ? avatarIdOrUrl
      : cache.has(avatarIdOrUrl)
        ? cache.get(avatarIdOrUrl) ?? null
        : undefined;

  const [url, setUrl] = useState<string | null>(() => {
    if (!avatarIdOrUrl) return null;
    if (avatarIdOrUrl.startsWith('http')) return avatarIdOrUrl;
    return cache.get(avatarIdOrUrl) ?? null;
  });

  useEffect(() => {
    if (!avatarIdOrUrl || immediateUrl !== undefined) {
      return;
    }

    let active = true;
    const avatarRef = doc(db, COLLECTIONS.avatars, avatarIdOrUrl);

    getDoc(avatarRef)
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          const data = snap.data();
          const resolved =
            (typeof data.imageUrl === 'string' ? data.imageUrl : null) ??
            (typeof data.assetUrl === 'string' ? data.assetUrl : null) ??
            (typeof data.url === 'string' ? data.url : null);
          cache.set(avatarIdOrUrl, resolved);
          setUrl(resolved);
        } else {
          cache.set(avatarIdOrUrl, null);
          setUrl(null);
        }
      })
      .catch(() => {
        if (!active) return;
        cache.set(avatarIdOrUrl, null);
        setUrl(null);
      });

    return () => {
      active = false;
    };
  }, [avatarIdOrUrl, immediateUrl]);

  return immediateUrl !== undefined ? immediateUrl : url;
}
