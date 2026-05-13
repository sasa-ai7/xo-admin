import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/formatters';
import { iapTransactionDisplayTime } from '../../types/transaction';
import type { IAPTransaction } from '../../types/transaction';

interface CoinHistoryProps {
  transactions: IAPTransaction[];
}

export function CoinHistory({ transactions }: CoinHistoryProps) {
  const { t } = useLanguage();

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-glass-border bg-glass-bg p-6 text-center text-gray-500">
        {t('noData')}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="rounded-xl border border-glass-border bg-glass-bg overflow-hidden"
    >
      <div className="p-4">
        <h3 className="mb-3 font-orbitron text-sm font-semibold text-neon-blue">
          {t('coinHistory')}
        </h3>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2"
            >
              <div className="min-w-0">
                <div className="text-xs text-gray-400">{formatDate(iapTransactionDisplayTime(tx))}</div>
                <div className="font-mono text-[10px] text-gray-600">
                  {tx.orderId || '—'}
                </div>
              </div>
              <div className="text-end">
                <div className="font-orbitron text-sm text-green-400">
                  +{tx.coinsAdded ?? 0}
                </div>
                <div className="text-[10px] text-gray-500">
                  {tx.balanceBefore ?? '?'} → {tx.balanceAfter ?? '?'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
