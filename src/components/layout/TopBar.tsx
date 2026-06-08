import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Languages,
  LogOut,
  Menu,
  Command,
  MoreVertical,
  ShieldCheck,
  Bell,
  Sun,
  Moon,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useDataStore } from '../../stores/dataStore';
import { RefreshButton } from '../shared/RefreshButton';
import type { en } from '../../i18n/en';

type LabelKey = keyof typeof en;

// Route → breadcrumb label key. Checked exact-first, then by longest prefix.
const ROUTE_LABELS: Array<{ path: string; key: LabelKey }> = [
  { path: '/users', key: 'masterUsers' },
  { path: '/purchase-orders', key: 'purchaseOrders' },
  { path: '/transactions', key: 'transactions' },
  { path: '/radar', key: 'liveRadar' },
  { path: '/arena-rooms', key: 'arenaRooms' },
  { path: '/room-logs', key: 'roomLogs' },
  { path: '/referrals', key: 'referralCodes' },
  { path: '/deleted', key: 'deletedAccounts' },
  { path: '/watchlist', key: 'watchlist' },
  { path: '/settings', key: 'settings' },
  { path: '/', key: 'dashboard' },
];

function routeLabelKey(pathname: string): LabelKey {
  const exact = ROUTE_LABELS.find((r) => r.path === pathname);
  if (exact) return exact.key;
  const prefix = ROUTE_LABELS.filter((r) => r.path !== '/' && pathname.startsWith(r.path)).sort(
    (a, b) => b.path.length - a.path.length
  )[0];
  return prefix?.key ?? 'dashboard';
}

export function TopBar() {
  const { lang, toggleLang, t } = useLanguage();
  const logout = useAuthStore((s) => s.logout);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const pageLabel = t(routeLabelKey(location.pathname));

  // "Needs attention" badge — failed-after-payment orders in the loaded set.
  const purchaseOrders = useDataStore((s) => s.purchaseOrders);
  const alertCount = purchaseOrders.reduce(
    (n, o) => (o.status === 'verification_failed' || o.status === 'grant_failed' ? n + 1 : n),
    0
  );

  return (
    <header className="relative z-20 border-b border-xo-border bg-xo-bg/76 backdrop-blur-xl">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-xo-border bg-xo-panel/70 text-xo-muted transition-all hover:border-xo-border-active hover:text-xo-cyan hover:shadow-[0_0_18px_rgba(85,214,255,0.14)]"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="xo-logo-mark truncate font-orbitron text-sm font-semibold tracking-[0.25em] sm:text-base">
                XO ARENA
              </span>
              <span className="hidden text-xs text-xo-muted/50 sm:inline">|</span>
              <span className="hidden text-xs text-xo-muted sm:inline">{pageLabel}</span>
            </div>
            <p className="truncate text-[10px] text-xo-muted sm:hidden">{pageLabel}</p>
          </div>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-300 sm:flex">
            <span className="animate-pulse-dot h-2 w-2 rounded-full bg-emerald-300" />
            <ShieldCheck size={13} />
            <span>{t('adminOnline')}</span>
          </div>

          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            aria-label={t('notifications')}
            title={t('failedAfterPayment')}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-xo-border bg-xo-panel/70 text-xo-muted transition-all hover:border-xo-border-active hover:text-xo-cyan hover:shadow-[0_0_18px_rgba(85,214,255,0.14)]"
          >
            <Bell size={16} />
            {alertCount > 0 && (
              <span className="absolute -end-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={t('toggleTheme')}
            title={t('toggleTheme')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-xo-border bg-xo-panel/70 text-xo-muted transition-all hover:border-xo-border-active hover:text-xo-cyan hover:shadow-[0_0_18px_rgba(85,214,255,0.14)]"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <RefreshButton className="h-9 w-9" />

          <button
            className="hidden items-center gap-1.5 rounded-xl border border-xo-border bg-xo-panel/50 px-3 py-2 text-xs text-xo-muted transition-all hover:border-xo-border-active hover:text-xo-cyan md:flex"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-command-palette'));
            }}
          >
            <Command size={13} />
            <span>Ctrl+K</span>
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              className="flex min-h-9 items-center gap-2 rounded-xl border border-xo-border bg-xo-panel/50 px-3 py-2 text-xs text-xo-muted transition-all hover:border-xo-border-active hover:text-xo-cyan"
              onClick={toggleLang}
            >
              <Languages size={14} />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>

            <button
              className="flex min-h-9 items-center gap-2 rounded-xl border border-xo-border bg-xo-panel/50 px-3 py-2 text-xs text-xo-muted transition-all hover:border-xo-danger/40 hover:text-xo-danger"
              onClick={logout}
            >
              <LogOut size={14} />
              <span>{t('logout')}</span>
            </button>
          </div>

          <div className="relative sm:hidden">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-xo-border bg-xo-panel/70 text-xo-muted transition-all hover:border-xo-border-active hover:text-xo-cyan"
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-label="Open more actions"
            >
              <MoreVertical size={16} />
            </button>

            {moreOpen && (
              <div className="absolute end-0 top-[calc(100%+0.5rem)] z-30 flex min-w-40 flex-col gap-1 rounded-2xl border border-xo-border bg-xo-bg/95 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <button
                  className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-start text-xs text-gray-300 transition-colors hover:bg-neon-cyan/10 hover:text-neon-cyan"
                  onClick={() => {
                    setMoreOpen(false);
                    toggleLang();
                  }}
                >
                  <Languages size={14} />
                  <span>{lang === 'en' ? 'العربية' : 'English'}</span>
                </button>
                <button
                  className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-start text-xs text-gray-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => {
                    setMoreOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={14} />
                  <span>{t('logout')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
