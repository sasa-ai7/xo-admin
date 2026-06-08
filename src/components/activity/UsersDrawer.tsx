import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface UsersDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function UsersDrawer({
  open,
  onClose,
  title = 'Users',
  subtitle,
  children,
}: UsersDrawerProps) {
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close users drawer"
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex h-dvh w-[85vw] max-w-[360px] flex-col border-e border-glass-border bg-black/95 shadow-[0_0_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-transform duration-300 ease-out lg:hidden',
          'pt-[max(env(safe-area-inset-top),0.75rem)] pb-[max(env(safe-area-inset-bottom),1rem)]',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-start justify-between gap-3 px-3 pb-3">
          <div className="min-w-0">
            <p className="font-orbitron text-sm font-bold tracking-[0.24em] text-xo-cyan">{title}</p>
            {subtitle ? <p className="mt-1 text-[11px] text-gray-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-black/40 text-gray-300"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3">{children}</div>
      </aside>
    </>
  );
}
