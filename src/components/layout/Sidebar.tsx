import { useEffect } from 'react';
import { NavLink } from 'react-router';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Trash2,
  Eye,
  X,
  Radio,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../i18n/LanguageContext';
import { useUIStore } from '../../stores/uiStore';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const },
  { path: '/users', icon: Users, labelKey: 'masterUsers' as const },
  { path: '/transactions', icon: Receipt, labelKey: 'transactions' as const },
  { path: '/radar', icon: Radio, labelKey: 'liveRadar' as const },
  { path: '/deleted', icon: Trash2, labelKey: 'deletedAccounts' as const },
  { path: '/watchlist', icon: Eye, labelKey: 'watchlist' as const },
];

export function Sidebar() {
  const { t } = useLanguage();
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncSidebarForViewport = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    syncSidebarForViewport();
    window.addEventListener('resize', syncSidebarForViewport);
    return () => window.removeEventListener('resize', syncSidebarForViewport);
  }, [setSidebarOpen]);

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex h-dvh w-[85vw] max-w-[360px] flex-col border-e border-glass-border bg-black/90 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-[transform,width] duration-300 ease-out',
          'pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),1rem)] md:relative md:inset-auto md:z-20 md:max-w-none md:shrink-0 md:shadow-none',
          sidebarOpen ? 'translate-x-0 md:w-64 lg:w-72' : '-translate-x-full md:translate-x-0 md:w-20'
        )}
      >
        <div className="flex items-center justify-between px-3 pb-4 md:px-4">
          {sidebarOpen ? (
            <motion.div
              className="flex min-w-0 items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <span className="neon-text-orange font-orbitron text-xl font-black tracking-[0.35em] text-neon-orange sm:text-2xl">
                XO
              </span>
              <span className="truncate font-orbitron text-base font-bold text-white/80 sm:text-lg">
                KINGS
              </span>
            </motion.div>
          ) : (
            <span className="neon-text-orange mx-auto font-orbitron text-xl font-black tracking-[0.35em] text-neon-orange">
              XO
            </span>
          )}

          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:text-white md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-neon-orange/25 to-transparent md:mx-4" />

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2.5 py-4 md:px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex min-h-11 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-neon-orange/10 text-neon-orange shadow-[inset_0_0_10px_rgba(255,85,0,0.12)]'
                    : 'text-gray-400 hover:bg-glass-hover hover:text-white'
                )
              }
              onClick={() => {
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-2xl bg-neon-orange/10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <item.icon size={19} className="relative shrink-0" />
                  {sidebarOpen ? (
                    <motion.span
                      className="relative truncate"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                    >
                      {t(item.labelKey)}
                    </motion.span>
                  ) : (
                    <div className="pointer-events-none absolute start-full ms-2 hidden rounded-lg border border-glass-border bg-surface-light px-2 py-1 text-xs text-white shadow-lg group-hover:block md:block">
                      {t(item.labelKey)}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="px-3 pt-3 md:px-4">
            <div className="rounded-2xl border border-glass-border bg-glass-bg p-3 text-center">
              <p className="font-orbitron text-[10px] font-bold tracking-[0.3em] text-gray-600">
                ADMIN PANEL v2.0
              </p>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
