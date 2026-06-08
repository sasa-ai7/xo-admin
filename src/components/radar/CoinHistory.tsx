import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatDate } from '../../utils/formatters';
import { iapTransactionDisplayTime, type IAPTransaction } from '../../types/transaction';
import {
  purchaseOrderDisplayTime,
  purchaseOrderCoins,
  isNoisePurchaseOrder,
  type PurchaseOrder,
} from '../../types/purchaseOrder';
import type { WalletLedgerEntry } from '../../hooks/useWalletLedgerForUser';
import { cn } from '../../utils/cn';

interface CoinHistoryProps {
  transactions?: IAPTransaction[];
  purchaseOrders?: PurchaseOrder[];
  walletLedger?: WalletLedgerEntry[];
}

type EntryKind = 'order' | 'ledger' | 'legacy';

interface UnifiedEntry {
  id: string;
  kind: EntryKind;
  date: unknown;
  orderId?: string;
  productId?: string;
  status?: string;
  coinsAdded: number;
  balanceBefore?: number;
  balanceAfter?: number;
  isNoise: boolean;
}

function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = new Date(value).getTime();
    return Number.isNaN(n) ? 0 : n;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      return (value as { toDate(): Date }).toDate().getTime();
    } catch {
      return 0;
    }
  }
  return 0;
}

function dotColor(entry: UnifiedEntry): string {
  if (entry.isNoise || entry.kind === 'legacy') return 'bg-gray-600';
  if (entry.kind === 'ledger') return 'bg-green-500';
  const s = entry.status ?? '';
  if (s === 'grant_success' || s === 'avatar_unlock_success') return 'bg-green-500';
  if (s === 'already_processed') return 'bg-yellow-400';
  if (s === 'grant_failed' || s === 'verification_failed') return 'bg-red-500';
  return 'bg-blue-400';
}

function coinsColor(entry: UnifiedEntry): string {
  if (entry.isNoise || entry.kind === 'legacy') return 'text-gray-500';
  if (entry.kind === 'ledger') return 'text-green-400';
  const s = entry.status ?? '';
  if (s === 'grant_success' || s === 'avatar_unlock_success') return 'text-green-400';
  if (s === 'already_processed') return 'text-yellow-400';
  if (s === 'grant_failed' || s === 'verification_failed') return 'text-red-400';
  return 'text-blue-400';
}

function statusLabel(entry: UnifiedEntry): string {
  if (entry.kind === 'legacy') return 'legacy';
  if (entry.kind === 'ledger') return 'ledger';
  return entry.status ?? '';
}

export function CoinHistory({ transactions = [], purchaseOrders = [], walletLedger = [] }: CoinHistoryProps) {
  const { t } = useLanguage();

  const entries = useMemo((): UnifiedEntry[] => {
    const orderIds = new Set<string>();
    const result: UnifiedEntry[] = [];

    for (const order of purchaseOrders) {
      if (order.orderId) orderIds.add(order.orderId);
      result.push({
        id: order.id,
        kind: 'order',
        date: purchaseOrderDisplayTime(order),
        orderId: order.orderId,
        productId: order.productId,
        status: order.status,
        coinsAdded: purchaseOrderCoins(order),
        balanceBefore: order.balanceBefore,
        balanceAfter: order.balanceAfter,
        isNoise: isNoisePurchaseOrder(order),
      });
    }

    for (const entry of walletLedger) {
      // Skip ledger entries that are already covered by a purchase order
      if (entry.orderId && orderIds.has(entry.orderId)) continue;
      const coins = typeof entry.coinsAdded === 'number' ? entry.coinsAdded : 0;
      result.push({
        id: `ledger:${entry.id}`,
        kind: 'ledger',
        date: entry.createdAt,
        orderId: entry.orderId,
        productId: entry.productId,
        status: entry.source ?? entry.status,
        coinsAdded: coins,
        balanceBefore: entry.balanceBefore,
        balanceAfter: entry.balanceAfter,
        isNoise: false,
      });
    }

    for (const tx of transactions) {
      // Skip legacy IAP entries already covered by a purchase order
      if (tx.orderId && orderIds.has(tx.orderId)) continue;
      const coins = typeof tx.coinsAdded === 'number' ? tx.coinsAdded : 0;
      result.push({
        id: `legacy:${tx.id}`,
        kind: 'legacy',
        date: iapTransactionDisplayTime(tx),
        orderId: tx.orderId,
        productId: tx.productId,
        status: tx.status,
        coinsAdded: coins,
        balanceBefore: tx.balanceBefore,
        balanceAfter: tx.balanceAfter,
        isNoise: false,
      });
    }

    return result.sort((a, b) => toMs(b.date) - toMs(a.date));
  }, [purchaseOrders, walletLedger, transactions]);

  if (entries.length === 0) {
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
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2',
                entry.isNoise || entry.kind === 'legacy'
                  ? 'bg-white/[0.01] opacity-60'
                  : 'bg-white/[0.04]'
              )}
            >
              <div className="flex min-w-0 items-start gap-2">
                <span
                  className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', dotColor(entry))}
                />
                <div className="min-w-0">
                  <div className="text-xs text-gray-400">{formatDate(entry.date)}</div>
                  <div className="font-mono text-[10px] text-gray-600 truncate">
                    {entry.orderId ?? entry.productId ?? '—'}
                  </div>
                  {entry.status && (
                    <div className="font-mono text-[9px] text-gray-600/70 truncate">
                      {statusLabel(entry)}
                    </div>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-end">
                <div className={cn('font-orbitron text-sm', coinsColor(entry))}>
                  {entry.coinsAdded > 0 ? `+${entry.coinsAdded}` : entry.coinsAdded}
                </div>
                {(entry.balanceBefore != null || entry.balanceAfter != null) && (
                  <div className="text-[10px] text-gray-500">
                    {entry.balanceBefore ?? '?'} → {entry.balanceAfter ?? '?'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
