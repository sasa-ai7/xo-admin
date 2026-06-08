import { useEffect } from 'react';
import { NavLink } from 'react-router';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Receipt,
  ShoppingBag,
  Trash2,
  Eye,
  X,
  Radio,
  Swords,
  ScrollText,
  Share2,
  Settings,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLanguage } from '../../i18n/LanguageContext';
import { useUIStore } from '../../stores/uiStore';
import { IconBadge, type IconBadgeVariant } from '../shared/IconBadge';

const APP_VERSION = 'v2.0';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const, variant: 'active' as IconBadgeVariant },
  { path: '/users', icon: Users, labelKey: 'masterUsers' as const, variant: 'users' as IconBadgeVariant },
  { path: '/purchase-orders', icon: ShoppingBag, labelKey: 'purchaseOrders' as const, variant: 'purchase' as IconBadgeVariant },
  { path: '/transactions', icon: Receipt, labelKey: 'transactions' as const, variant: 'revenue' as IconBadgeVariant },
  { path: '/radar', icon: Radio, labelKey: 'liveRadar' as const, variant: 'online' as IconBadgeVariant },
  { path: '/arena-rooms', icon: Swords, labelKey: 'arenaRooms' as const, variant: 'rooms' as IconBadgeVariant },
  { path: '/room-logs', icon: ScrollText, labelKey: 'roomLogs' as const, variant: 'logs' as IconBadgeVariant },
  { path: '/referrals', icon: Share2, labelKey: 'referralCodes' as const, variant: 'referrals' as IconBadgeVariant },
  { path: '/deleted', icon: Trash2, labelKey: 'deletedAccounts' as const, variant: 'deletion' as IconBadgeVariant },
  { path: '/watchlist', icon: Eye, labelKey: 'watchlist' as const, variant: 'watchlist' as IconBadgeVariant },
  { path: '/settings', icon: Settings, labelKey: 'settings' as const, variant: 'settings' as IconBadgeVariant },
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
          'fixed inset-y-0 start-0 z-50 flex h-dvh w-[85vw] max-w-[360px] flex-col border-e border-xo-border bg-xo-bg/90 shadow-[0_0_40px_rgba(3,9,20,0.55)] backdrop-blur-xl transition-[transform,width] duration-300 ease-out',
          'pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),1rem)] md:relative md:inset-auto md:z-20 md:max-w-none md:shrink-0 md:shadow-none',
          sidebarOpen ? 'translate-x-0 md:w-64 lg:w-72' : '-translate-x-full md:translate-x-0 md:w-20'
        )}
      >
        <div className="flex items-center justify-between px-3 pb-4 md:px-4">
          {sidebarOpen ? (
            <motion.div
              className="flex min-w-0 flex-col"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="xo-logo-mark font-orbitron text-xl font-black tracking-[0.35em] sm:text-2xl">
                  XO
                </span>
                <span className="truncate font-orbitron text-base font-bold text-xo-text/85 sm:text-lg">
                  ARENA
                </span>
              </div>
              <p className="mt-0.5 font-orbitron text-[9px] font-semibold tracking-[0.3em] text-xo-muted">
                ADMIN CONTROL
              </p>
            </motion.div>
          ) : (
            <span className="xo-logo-mark mx-auto font-orbitron text-xl font-black tracking-[0.35em]">
              XO
            </span>
          )}

          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl text-xo-muted transition-colors hover:text-xo-text md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-3 h-px bg-gradient-to-r from-transparent via-xo-cyan/35 to-transparent md:mx-4" />

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
                    ? 'bg-xo-cyan/10 text-xo-cyan shadow-[inset_0_0_16px_rgba(85,214,255,0.12),0_0_24px_rgba(85,214,255,0.08)]'
                    : 'text-xo-muted hover:bg-xo-panel-hover hover:text-xo-text'
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
                      className="absolute inset-0 rounded-2xl border border-xo-cyan/25 bg-gradient-to-r from-xo-cyan/15 via-xo-sky/10 to-xo-violet/10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <IconBadge icon={item.icon} variant={item.variant} size="sm" hex active={isActive} pulse={isActive && item.path === '/radar'} glow={isActive} className="relative" />
                  {isActive && <span className="animate-border-scan absolute end-0 top-2 h-7 w-0.5 rounded-full bg-xo-cyan" />}
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
                    <div className="pointer-events-none absolute start-full ms-2 hidden rounded-lg border border-xo-border bg-surface-light px-2 py-1 text-xs text-xo-text shadow-lg group-hover:block md:block">
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
            <div className="xo-card xo-rim relative overflow-hidden p-3.5 text-center">
              {/* Subtle decorative glow orb */}
              <span className="pointer-events-none absolute -end-6 -top-6 h-20 w-20 rounded-full bg-xo-violet/20 blur-2xl" aria-hidden />
              <span className="pointer-events-none absolute -start-6 -bottom-6 h-16 w-16 rounded-full bg-xo-cyan/15 blur-2xl" aria-hidden />
              <div className="relative flex items-center justify-center gap-1.5">
                <span className="xo-logo-mark font-orbitron text-sm font-black tracking-[0.3em]">XO</span>
                <span className="font-orbitron text-sm font-bold tracking-[0.2em] text-xo-text/80">ARENA</span>
              </div>
              <p className="relative mt-1 font-orbitron text-[9px] font-semibold tracking-[0.32em] text-xo-muted">
                ADMIN CONTROL
              </p>
              <div className="relative mt-2 flex items-center justify-center gap-2 text-[9px] text-xo-muted/55">
                <span className="rounded-full border border-xo-border/70 px-2 py-0.5 font-orbitron tracking-wider">{APP_VERSION}</span>
                <a
                  href="https://deerflow.tech"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-xo-cyan"
                >
                  Created By Deerflow
                </a>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
