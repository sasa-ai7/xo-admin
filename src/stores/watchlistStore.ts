import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WatchlistState {
  watchlist: string[];
  addToWatchlist: (uid: string) => void;
  removeFromWatchlist: (uid: string) => void;
  toggleWatchlist: (uid: string) => void;
  isWatched: (uid: string) => boolean;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      watchlist: [],
      addToWatchlist: (uid) =>
        set((state) => ({
          watchlist: state.watchlist.includes(uid)
            ? state.watchlist
            : [...state.watchlist, uid],
        })),
      removeFromWatchlist: (uid) =>
        set((state) => ({
          watchlist: state.watchlist.filter((id) => id !== uid),
        })),
      toggleWatchlist: (uid) => {
        const { watchlist } = get();
        if (watchlist.includes(uid)) {
          set({ watchlist: watchlist.filter((id) => id !== uid) });
        } else {
          set({ watchlist: [...watchlist, uid] });
        }
      },
      isWatched: (uid) => get().watchlist.includes(uid),
    }),
    { name: 'xo-watchlist' }
  )
);
