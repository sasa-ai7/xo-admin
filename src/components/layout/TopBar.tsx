import { useState } from 'react';
import {
  Languages,
  LogOut,
  Menu,
  Command,
  MoreVertical,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { RefreshButton } from '../shared/RefreshButton';

export function TopBar() {
  const { lang, toggleLang, t } = useLanguage();
  const logout = useAuthStore((s) => s.logout);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <header className="relative z-20 border-b border-glass-border bg-black/70 backdrop-blur-xl">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-black/40 text-gray-300 transition-all hover:border-neon-orange/30 hover:text-neon-orange"
            onClick={toggleSidebar}
            aria-label="Toggle navigation"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="neon-text-orange truncate font-orbitron text-sm font-semibold tracking-[0.25em] text-neon-orange sm:text-base">
                XO KINGS
              </span>
              <span className="hidden text-xs text-gray-600 sm:inline">|</span>
              <span className="hidden text-xs text-gray-500 sm:inline">
                {t('dashboard')}
              </span>
            </div>
            <p className="truncate text-[10px] text-gray-500 sm:hidden">
              {t('dashboard')}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <RefreshButton className="h-9 w-9" />

          <button
            className="hidden items-center gap-1.5 rounded-xl border border-glass-border px-3 py-2 text-xs text-gray-500 transition-all hover:border-neon-orange/30 hover:text-gray-300 md:flex"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-command-palette'));
            }}
          >
            <Command size={13} />
            <span>Ctrl+K</span>
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              className="flex min-h-9 items-center gap-2 rounded-xl border border-glass-border px-3 py-2 text-xs text-gray-400 transition-all hover:border-neon-cyan/30 hover:text-neon-cyan"
              onClick={toggleLang}
            >
              <Languages size={14} />
              <span>{lang === 'en' ? 'العربية' : 'English'}</span>
            </button>

            <button
              className="flex min-h-9 items-center gap-2 rounded-xl border border-glass-border px-3 py-2 text-xs text-gray-400 transition-all hover:border-red-500/30 hover:text-red-400"
              onClick={logout}
            >
              <LogOut size={14} />
              <span>{t('logout')}</span>
            </button>
          </div>

          <div className="relative sm:hidden">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-glass-border bg-black/40 text-gray-300 transition-all hover:border-neon-orange/30 hover:text-neon-orange"
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-label="Open more actions"
            >
              <MoreVertical size={16} />
            </button>

            {moreOpen && (
              <div className="absolute end-0 top-[calc(100%+0.5rem)] z-30 flex min-w-40 flex-col gap-1 rounded-2xl border border-glass-border bg-black/95 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <button
                  className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-gray-300 transition-colors hover:bg-neon-cyan/10 hover:text-neon-cyan"
                  onClick={() => {
                    setMoreOpen(false);
                    toggleLang();
                  }}
                >
                  <Languages size={14} />
                  <span>{lang === 'en' ? 'العربية' : 'English'}</span>
                </button>
                <button
                  className="flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-gray-300 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
