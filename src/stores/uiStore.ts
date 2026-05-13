import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  selectedUserId: string | null;
  selectedUserEmail: string | null;
  radarModalOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openRadarModal: (userId: string, email: string) => void;
  closeRadarModal: () => void;
}

const getInitialSidebarState = () => {
  if (typeof window === 'undefined') return true;
  return window.innerWidth >= 1024;
};

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: getInitialSidebarState(),
  selectedUserId: null,
  selectedUserEmail: null,
  radarModalOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  openRadarModal: (userId, email) =>
    set({ selectedUserId: userId, selectedUserEmail: email, radarModalOpen: true }),
  closeRadarModal: () =>
    set({ selectedUserId: null, selectedUserEmail: null, radarModalOpen: false }),
}));
