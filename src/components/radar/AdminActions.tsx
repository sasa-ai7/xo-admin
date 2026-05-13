import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { NeonButton } from '../shared/NeonButton';
import { applyAdminCoinAdjustment } from '../../services/adminCoinAdjustment';

interface AdminActionsProps {
  userId: string;
  currentCoins: number;
}

export function AdminActions({ userId, currentCoins }: AdminActionsProps) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'add' | 'deduct' | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async () => {
    const num = parseInt(amount, 10);
    if (!num || num <= 0 || !mode) return;

    const delta = mode === 'add' ? num : -num;
    const newBalance = currentCoins + delta;
    if (newBalance < 0) {
      setFeedback('Error: Cannot reduce coins below 0');
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      await applyAdminCoinAdjustment({
        userId,
        delta,
        reason: reason.trim() || null,
      });
      setFeedback(
        mode === 'add'
          ? `Added ${num} coins. New balance: ${newBalance}`
          : `Deducted ${num} coins. New balance: ${newBalance}`
      );
      setAmount('');
      setReason('');
      setMode(null);
    } catch (err) {
      setFeedback(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-glass-border bg-glass-bg p-4">
      <h3 className="mb-3 font-orbitron text-sm font-semibold text-neon-purple">
        {t('manageCoins')}
      </h3>

      <div className="flex gap-2">
        <NeonButton
          variant="cyan"
          size="sm"
          onClick={() => setMode('add')}
          className={mode === 'add' ? 'bg-neon-cyan/20' : ''}
        >
          <Plus size={14} className="inline" /> {t('addCoins')}
        </NeonButton>
        <NeonButton
          variant="red"
          size="sm"
          onClick={() => setMode('deduct')}
          className={mode === 'deduct' ? 'bg-red-500/20' : ''}
        >
          <Minus size={14} className="inline" /> {t('deductCoins')}
        </NeonButton>
      </div>

      {mode && (
        <div className="mt-3 space-y-2">
          <input
            type="number"
            placeholder={t('amount')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-glass-border bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-neon-blue/50"
            min="1"
          />
          <input
            type="text"
            placeholder={t('reason')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-glass-border bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-neon-blue/50"
          />
          <NeonButton
            variant={mode === 'add' ? 'cyan' : 'red'}
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !amount}
          >
            {loading ? '...' : t('confirm')}
          </NeonButton>
        </div>
      )}

      {feedback && (
        <p className={`mt-2 text-xs ${feedback.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}
