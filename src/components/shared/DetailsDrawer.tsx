import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  width?: 'md' | 'lg' | 'xl';
  children: ReactNode;
  headerExtras?: ReactNode;
  footer?: ReactNode;
}

const widthClasses: Record<NonNullable<DetailsDrawerProps['width']>, string> = {
  md: 'sm:w-[440px]',
  lg: 'sm:w-[560px]',
  xl: 'sm:w-[720px]',
};

export function DetailsDrawer({
  open,
  onClose,
  title,
  subtitle,
  width = 'lg',
  children,
  headerExtras,
  footer,
}: DetailsDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            key="drawer"
            className={cn(
              'fixed inset-y-0 end-0 z-[61] flex w-full flex-col border-s border-glass-border bg-black/95 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-xl',
              widthClasses[width]
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <header className="flex items-start justify-between gap-4 border-b border-glass-border px-5 pb-4 pt-[max(env(safe-area-inset-top),1rem)]">
              <div className="min-w-0">
                <h2 className="truncate font-orbitron text-base font-bold text-white">{title}</h2>
                {subtitle && <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {headerExtras}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-glass-border text-gray-400 transition-colors hover:border-red-500/30 hover:text-red-400"
                  aria-label="Close drawer"
                >
                  <X size={16} />
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
            {footer && (
              <footer className="border-t border-glass-border px-5 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
                {footer}
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
