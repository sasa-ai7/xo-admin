import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { watchlistChargeOverridesCollection } from '../firebase/collections';
import type { WatchlistChargeOverride } from '../types/watchlist';

/**
 * Subscribes to admin charge-reset checkpoints, keyed by uid. Used to compute
 * displayed/monitored revenue (purchases after the reset checkpoint).
 */
export function useWatchlistOverrides(): {
  overrides: Map<string, WatchlistChargeOverride>;
  loading: boolean;
} {
  const [overrides, setOverrides] = useState<Map<string, WatchlistChargeOverride>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      watchlistChargeOverridesCollection,
      (snap) => {
        const map = new Map<string, WatchlistChargeOverride>();
        snap.forEach((d) => {
          const data = d.data() as WatchlistChargeOverride;
          map.set(d.id, { ...data, uid: data.uid ?? d.id });
        });
        setOverrides(map);
        setLoading(false);
      },
      () => setLoading(false) // collection may not exist / be denied yet — treat as no overrides
    );
    return () => unsub();
  }, []);

  return { overrides, loading };
}
