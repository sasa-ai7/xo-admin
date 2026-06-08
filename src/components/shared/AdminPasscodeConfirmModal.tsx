import { useEffect, useState } from 'react';
import { ShieldAlert, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { verifyPin } from '../../utils/pinHash';
import { cn } from '../../utils/cn';

interface AdminPasscodeConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  /** When set, the admin must also type this exact word (e.g. "RESET"). */
  requireKeyword?: string;
  requireReason?: boolean;
  /** Resolve to close; throw to surface an error and keep the modal open. */
  onConfirm: (reason: string) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Reusable admin-passcode gate for destructive/sensitive actions.
 * The passcode is verified via the same hashed check as login (verifyPin) and
 * is never logged or echoed back.
 */
export function AdminPasscodeConfirmModal({
  title,
  message,
  confirmLabel,
  danger = true,
  requireKeyword,
  requireReason,
  onConfirm,
  onClose,
}: AdminPasscodeConfirmModalProps) {
  const { t } = useLanguage();
  const [passcode, setPasscode] = useState('');
  const [reason, setReason] = useState('');
  const [keyword, setKeyword] = useState('');
  const [passValid, setPassValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // verifyPin('') simply resolves false — no synchronous setState needed.
    verifyPin(passcode)
      .then((ok) => {
        if (active) setPassValid(Boolean(passcode) && ok);
      })
      .catch(() => {
        if (active) setPassValid(false);
      });
    return () => {
      active = false;
    };
  }, [passcode]);

  const keywordOk = !requireKeyword || keyword.trim().toUpperCase() === requireKeyword.toUpperCase();
  const reasonOk = !requireReason || reason.trim().length > 0;
  const canConfirm = passValid && keywordOk && reasonOk && !loading;

  async function handleConfirm() {
    if (!passValid) {
      setError(t('wrongPasscode'));
      return;
    }
    if (!canConfirm) return;
    setLoading(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={loading ? undefined : onClose} />
      <div className={cn('xo-bezel relative z-10 w-full max-w-sm rounded-2xl p-6', danger && 'border-rose-500/40')}>
        <div className="mb-3 flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              danger ? 'bg-rose-500/15 text-rose-300' : 'bg-xo-cyan/15 text-xo-cyan'
            )}
          >
            <ShieldAlert size={18} />
          </div>
          <h2 className="font-orbitron text-sm font-bold text-xo-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="ms-auto text-xo-muted transition-colors hover:text-xo-text disabled:opacity-40"
            aria-label={t('close')}
          >
            <X size={16} />
          </button>
        </div>

        <p className="mb-4 text-xs text-xo-muted">{message}</p>

        <label className="mb-1 block text-[11px] font-semibold text-xo-muted">{t('passcodeRequired')}</label>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={passcode}
          onChange={(e) => {
            setPasscode(e.target.value);
            setError(null);
          }}
          placeholder={t('enterPasscode')}
          className="mb-3 w-full rounded-xl border border-xo-border bg-xo-bg-soft/60 px-3 py-2 text-sm tracking-[0.3em] text-xo-text outline-none transition-colors focus:border-xo-border-active"
        />

        {requireKeyword && (
          <>
            <label className="mb-1 block text-[11px] font-semibold text-xo-muted">{t('typeToConfirm')}</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={requireKeyword}
              className="mb-3 w-full rounded-xl border border-xo-border bg-xo-bg-soft/60 px-3 py-2 text-sm text-xo-text outline-none transition-colors focus:border-xo-border-active"
            />
          </>
        )}

        <label className="mb-1 block text-[11px] font-semibold text-xo-muted">{t('reasonOptional')}</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-4 w-full rounded-xl border border-xo-border bg-xo-bg-soft/60 px-3 py-2 text-xs text-xo-text outline-none transition-colors focus:border-xo-border-active"
        />

        {error && <p className="mb-3 text-[11px] text-rose-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-xo-border py-2 text-xs text-xo-muted transition-colors hover:text-xo-text disabled:opacity-40"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40',
              danger ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-xo-cyan text-xo-bg-deep hover:brightness-110'
            )}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? t('processing') : confirmLabel ?? t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
