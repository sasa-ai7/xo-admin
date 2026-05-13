import { useMemo, useState } from 'react';
import { DollarSign, ShoppingCart, ChevronDown } from 'lucide-react';
import { useTransactions } from '../../hooks/useTransactions';
import { useLanguage } from '../../i18n/LanguageContext';
import { GlassCard } from '../shared/GlassCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { iapTransactionDisplayTime } from '../../types/transaction';

const COINS_PER_DOLLAR = 200;

export function TransactionsPage() {
  const { t } = useLanguage();
  const { data: transactions, loading } = useTransactions();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalRevenue = useMemo(
    () => transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    [transactions]
  );

  return (
    <div className="space-y-4">
      {/* Total Revenue Card */}
      <GlassCard>
        <div className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
            <DollarSign size={24} className="text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">{t('totalRevenue')}</p>
            <p className="font-orbitron text-2xl font-bold text-green-400">
              {formatCurrency(totalRevenue)}
            </p>
          </div>
          <div className="ms-auto text-right">
            <p className="text-xs text-gray-500">{transactions.length} transactions</p>
          </div>
        </div>
      </GlassCard>

      {/* Transactions List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : transactions.length === 0 ? (
        <GlassCard>
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-gray-500">{t('noData')}</p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="flex-1 overflow-y-auto py-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="group mb-1.5 mx-3">
                <button
                  onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-start transition-all duration-200 rounded-2xl cursor-pointer hover:bg-neon-orange/[0.04] bg-black/20"
                >
                  {/* Icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-emerald-400">
                    <ShoppingCart size={14} />
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-emerald-400">Purchase</p>
                    <p className="font-mono text-[10px] text-gray-600 mt-0.5">
                      {formatDate(iapTransactionDisplayTime(tx))}
                    </p>
                  </div>

                  {/* Coins & Amount Stacked */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-orbitron text-xs font-bold text-neon-orange">
                      +{(tx.coinsAdded ?? 0).toLocaleString()} coins
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {formatCurrency((tx.coinsAdded || 0) / COINS_PER_DOLLAR)}
                    </span>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`text-gray-600 transition-all duration-200 ml-2 ${
                      expandedId === tx.id ? 'rotate-180 text-neon-orange/40' : 'group-hover:text-neon-orange/40'
                    }`}
                  />
                </button>

                {/* Expanded Details */}
                {expandedId === tx.id && (
                  <div className="mt-1 mx-3 rounded-2xl bg-black/40 p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Account Email */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Account</p>
                        <p className="font-mono text-xs text-neon-cyan break-all">
                          {tx.email || tx.uid || '---'}
                        </p>
                      </div>

                      {/* Product ID */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Product ID</p>
                        <p className="font-mono text-xs text-gray-400 break-all">{tx.productId || '---'}</p>
                      </div>

                      {/* Coins & Amount */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Coins Granted</p>
                        <p className="font-orbitron text-sm text-neon-cyan">+{(tx.coinsAdded ?? 0).toLocaleString()}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Amount (USD)</p>
                        <p className="font-orbitron text-sm text-green-400">
                          {formatCurrency((tx.coinsAdded || 0) / COINS_PER_DOLLAR)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Purchase token / hash</p>
                      <p className="font-mono text-xs text-gray-500 break-all">
                        {tx.purchaseToken || tx.purchaseTokenHash || tx.orderId || '---'}
                      </p>
                    </div>

                    {(tx.provider || tx.currency) && (
                      <div className="grid grid-cols-2 gap-3">
                        {tx.provider && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Provider</p>
                            <p className="font-mono text-xs text-gray-400 break-all">{tx.provider}</p>
                          </div>
                        )}
                        {tx.currency && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Currency</p>
                            <p className="font-mono text-xs text-gray-400 break-all">{tx.currency}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      {(() => {
                        const status = tx.status || 'completed';
                        const color =
                          status === 'completed' || status === 'valid'
                            ? 'text-green-400 bg-green-500/10'
                            : status === 'pending'
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-red-400 bg-red-500/10';
                        return (
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${color}`}>
                            {status}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
