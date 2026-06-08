import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  destructive = true,
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-glass-border bg-surface-light p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-red-500/10 p-2">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h3 className="font-orbitron text-sm font-bold text-white">{title}</h3>
              </div>
              <p className="mt-3 text-sm text-gray-400">{message}</p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  onClick={onCancel}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-gray-400 transition-colors hover:bg-glass-hover hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={onConfirm}
                  className={`rounded-xl px-5 py-2 text-xs font-bold transition-all ${
                    destructive
                      ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                      : 'bg-xo-cyan/15 text-xo-cyan hover:bg-xo-cyan/25'
                  }`}
                >
                  {confirmLabel || t('confirm')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
