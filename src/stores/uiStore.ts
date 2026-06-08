import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface UIState {
  sidebarOpen: boolean;
  selectedUserId: string | null;
  selectedUserEmail: string | null;
  radarModalOpen: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openRadarModal: (userId: string, email: string) => void;
  closeRadarModal: () => void;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1024;
};

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem('xo_theme') === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('xo_theme', theme);
  } catch {
    /* ignore storage failures */
  }
}

// Apply the persisted theme immediately (before first paint) to avoid a flash.
applyTheme(getInitialTheme());

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: getInitialSidebarState(),
  selectedUserId: null,
  selectedUserEmail: null,
  radarModalOpen: false,
  theme: getInitialTheme(),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openRadarModal: (userId, email) =>
    set({ selectedUserId: userId, selectedUserEmail: email, radarModalOpen: true }),
  closeRadarModal: () =>
    set({ selectedUserId: null, selectedUserEmail: null, radarModalOpen: false }),

  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
}));
