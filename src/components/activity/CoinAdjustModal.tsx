import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { GlassCard } from '../shared/GlassCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { applyAdminCoinAdjustment } from '../../services/adminCoinAdjustment';

interface CoinAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentCoins: number;
  onSuccess: () => void;
}

export function CoinAdjustModal({
  isOpen,
  onClose,
  userId,
  currentCoins,
  onSuccess,
}: CoinAdjustModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const newCoins =
    operation === 'add'
      ? currentCoins + (parseInt(amount) || 0)
      : currentCoins - (parseInt(amount) || 0);

  const handleSubmit = async () => {
    if (!amount || parseInt(amount) === 0) {
      setError('Please enter an amount');
      return;
    }

    if (newCoins < 0) {
      setError('Cannot reduce coins below 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const delta = operation === 'add' ? parseInt(amount, 10) : -parseInt(amount, 10);
      if (!Number.isFinite(delta) || delta === 0) {
        setError('Please enter an amount');
        return;
      }
      await applyAdminCoinAdjustment({
        userId,
        delta,
        reason: null,
      });

      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update coins');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setOperation('add');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <GlassCard className="w-full max-w-md border-xo-cyan/25 shadow-[0_0_30px_rgba(85,214,255,0.18)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-xo-cyan/10 px-6 py-4">
          <h3 className="font-orbitron text-lg font-bold text-xo-cyan">
            Manage Coins
          </h3>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 transition-all hover:bg-xo-cyan/10 hover:text-xo-cyan"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-5">
          {/* Current Balance */}
          <div className="rounded-xl border border-glass-border bg-black/40 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Current Balance</p>
            <p className="mt-2 font-orbitron text-2xl font-bold text-neon-cyan">
              {currentCoins.toLocaleString()}
            </p>
          </div>

          {/* Operation Selection */}
          <div className="flex gap-3">
            <button
              onClick={() => setOperation('add')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 font-semibold transition-all ${
                operation === 'add'
                  ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                  : 'border border-glass-border text-gray-400 hover:text-gray-300'
              }`}
            >
              <Plus size={16} />
              Add
            </button>
            <button
              onClick={() => setOperation('subtract')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 font-semibold transition-all ${
                operation === 'subtract'
                  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                  : 'border border-glass-border text-gray-400 hover:text-gray-300'
              }`}
            >
              <Minus size={16} />
              Reduce
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              Amount ({operation === 'add' ? 'to add' : 'to reduce'})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              placeholder="0"
              className="w-full rounded-xl border border-xo-border bg-xo-panel/70 px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors focus:border-xo-border-active focus:shadow-[0_0_10px_rgba(85,214,255,0.1)]"
              min="0"
            />
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-xo-cyan/10 bg-xo-cyan/5 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">After Change</p>
            <p className="mt-2 font-orbitron text-2xl font-bold text-xo-cyan">
              {newCoins.toLocaleString()}
            </p>
            {newCoins < 0 && (
              <p className="mt-2 text-xs text-red-400 font-medium">⚠️ Balance will be negative</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-full border border-glass-border px-4 py-2.5 font-semibold text-gray-400 transition-all hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !amount || newCoins < 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-full bg-xo-cyan px-4 py-2.5 font-semibold text-xo-bg-deep transition-all hover:shadow-[0_0_15px_rgba(85,214,255,0.36)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Updating...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
