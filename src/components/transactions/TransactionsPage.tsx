import { useMemo, useState } from 'react';
import {
  ChevronDown,
  DollarSign,
  ShieldCheck,
  ShoppingCart,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Image,
  Package,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useDataStore } from '../../stores/dataStore';
import { useLanguage } from '../../i18n/LanguageContext';
import { GlassCard } from '../shared/GlassCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { CopyButton } from '../shared/CopyButton';
import { ErrorState } from '../shared/ErrorState';
import { IconBadge, type IconBadgeVariant } from '../shared/IconBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { iapTransactionDisplayTime, type IAPTransaction } from '../../types/transaction';
import {
  purchaseOrderDisplayTime,
  purchaseOrderCoins,
  purchaseOrderRevenue,
  isRealPurchaseOrder,
  isNoisePurchaseOrder,
  type PurchaseOrder,
} from '../../types/purchaseOrder';

type CombinedEntry =
  | { kind: 'order'; data: PurchaseOrder }
  | { kind: 'legacy'; data: IAPTransaction; isDuplicate?: boolean };

type TxFilter =
  | 'all'
  | 'coins'
  | 'avatars'
  | 'grant_success'
  | 'failed'
  | 'already_processed'
  | 'legacy'
  | 'noise';

function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const p = new Date(value).getTime();
    return Number.isNaN(p) ? 0 : p;
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

function statusColor(status: string | undefined): string {
  if (!status) return 'text-xo-muted bg-gray-500/10';
  if (status === 'grant_success' || status === 'avatar_unlock_success') return 'text-green-400 bg-green-500/10';
  if (status === 'already_processed') return 'text-yellow-400 bg-yellow-500/10';
  if (status === 'purchased_client_reported') return 'text-neon-cyan bg-neon-cyan/10';
  if (status === 'verification_failed' || status === 'grant_failed') return 'text-red-400 bg-red-500/10';
  if (status === 'started' || status === 'pending') return 'text-xo-muted bg-gray-500/10';
  if (status === 'canceled' || status === 'pre_purchase_error') return 'text-xo-muted bg-gray-500/10';
  return 'text-xo-muted bg-gray-500/10';
}

function statusLabel(status: string | undefined): string {
  if (!status) return 'unknown';
  const map: Record<string, string> = {
    grant_success: 'Grant Success',
    avatar_unlock_success: 'Avatar Unlocked',
    already_processed: 'Already Processed',
    purchased_client_reported: 'Purchased',
    verification_failed: 'Verification Failed',
    grant_failed: 'Grant Failed',
    started: 'Started',
    canceled: 'Canceled',
    pending: 'Pending',
    pre_purchase_error: 'Pre-Purchase Error',
    completed: 'Completed',
    valid: 'Valid',
  };
  return map[status] ?? status;
}

function OrderRow({ order }: { order: PurchaseOrder }) {
  const [expanded, setExpanded] = useState(false);
  const coins = purchaseOrderCoins(order);
  const revenue = purchaseOrderRevenue(order);
  const isNoise = isNoisePurchaseOrder(order);
  const isAvatar = order.productType === 'avatar';
  const isReal = isRealPurchaseOrder(order);
  const displayTime = purchaseOrderDisplayTime(order);
  const iconVariant: IconBadgeVariant = isNoise
    ? 'neutral'
    : isAvatar
      ? 'avatar'
      : order.status === 'already_processed'
        ? 'duplicate'
        : order.status === 'verification_failed' || order.status === 'grant_failed'
          ? 'failed'
          : 'purchase';

  return (
    <div className={`group mb-1.5 mx-3 ${isNoise ? 'opacity-60' : ''}`}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-start transition-all duration-200 rounded-2xl cursor-pointer hover:bg-xo-cyan/[0.04] bg-xo-bg-soft/40"
      >
        <IconBadge icon={isAvatar ? Image : ShoppingCart} variant={iconVariant} size="sm" hex pulse={isReal && !isNoise} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-[13px] font-medium ${
              isNoise ? 'text-xo-muted' : isAvatar ? 'text-neon-purple' : 'text-emerald-400'
            }`}>
              {isAvatar ? 'Avatar Purchase' : isReal ? 'Real Purchase' : 'Purchase'}
            </p>
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor(order.status)}`}>
              {statusLabel(order.status)}
            </span>
            {order.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400">
                <ShieldCheck size={9} /> Verified
              </span>
            )}
            {order.trustedRevenue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                Trusted
              </span>
            )}
            {isNoise && (
              <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] text-xo-muted">noise</span>
            )}
          </div>
          <p className="font-mono text-[10px] text-xo-muted/70 mt-0.5">
            {formatDate(displayTime)} · {order.email || order.uid || '—'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {coins > 0 && (
            <span className="font-orbitron text-xs font-bold text-xo-cyan">
              +{coins.toLocaleString()} coins
            </span>
          )}
          {revenue !== null && (
            <span className="text-[10px] text-green-400">{formatCurrency(revenue)}</span>
          )}
          {order.productId && (
            <span className="font-mono text-[10px] text-xo-muted/70 truncate max-w-[120px]">{order.productId}</span>
          )}
        </div>

        <ChevronDown
          size={14}
          className={`text-xo-muted/70 transition-all duration-200 ml-2 ${
            expanded ? 'rotate-180 text-xo-cyan/40' : 'group-hover:text-xo-cyan/40'
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-1 mx-3 rounded-2xl bg-xo-panel/70 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-xo-muted mb-1">Account</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-mono text-xs text-neon-cyan break-all">{order.email || order.uid || '—'}</p>
                {(order.email || order.uid) && (
                  <CopyButton value={String(order.email || order.uid)} label="account" size="xs" stopPropagation />
                )}
              </div>
              {order.uid && order.email && (
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-mono text-[10px] text-xo-muted/70 break-all">{order.uid}</p>
                  <CopyButton value={order.uid} label="UID" size="xs" stopPropagation />
                </div>
              )}
            </div>

            <div>
              <p className="text-xs text-xo-muted mb-1">Product ID</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs text-xo-muted break-all">{order.productId || '—'}</p>
                {order.productId && (
                  <CopyButton value={order.productId} label="product id" size="xs" stopPropagation />
                )}
              </div>
            </div>

            {coins > 0 && (
              <div>
                <p className="text-xs text-xo-muted mb-1">Coins Granted</p>
                <p className="font-orbitron text-sm text-neon-cyan">+{coins.toLocaleString()}</p>
              </div>
            )}

            {revenue !== null && (
              <div>
                <p className="text-xs text-xo-muted mb-1">
                  Revenue
                  {order.currencyCode && <span className="ml-1 text-[10px] text-xo-muted/70">({order.currencyCode})</span>}
                </p>
                <p className="font-orbitron text-sm text-green-400">{formatCurrency(revenue)}</p>
              </div>
            )}

            {order.balanceBefore !== undefined && order.balanceAfter !== undefined && (
              <div>
                <p className="text-xs text-xo-muted mb-1">Balance</p>
                <p className="font-mono text-xs text-xo-text/80">
                  {Number(order.balanceBefore).toLocaleString()} → {Number(order.balanceAfter).toLocaleString()}
                </p>
              </div>
            )}

            {order.platform && (
              <div>
                <p className="text-xs text-xo-muted mb-1">Platform</p>
                <p className="font-mono text-xs text-xo-muted">{order.platform}</p>
              </div>
            )}

            {order.appVersion && (
              <div>
                <p className="text-xs text-xo-muted mb-1">App Version</p>
                <p className="font-mono text-xs text-xo-muted">{order.appVersion}</p>
              </div>
            )}

            {isAvatar && order.avatarId !== undefined && (
              <div>
                <p className="text-xs text-xo-muted mb-1">Avatar ID</p>
                <p className="font-mono text-xs text-neon-purple">{String(order.avatarId)}</p>
              </div>
            )}

            {isAvatar && order.avatarAsset && (
              <div>
                <p className="text-xs text-xo-muted mb-1">Avatar Asset</p>
                <p className="font-mono text-xs text-xo-muted break-all">{order.avatarAsset}</p>
              </div>
            )}
          </div>

          {order.orderId && (
            <div>
              <p className="text-xs text-xo-muted mb-1">Order ID</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs text-xo-muted break-all">{order.orderId}</p>
                <CopyButton value={order.orderId} label="order id" size="xs" stopPropagation />
              </div>
            </div>
          )}

          {order.purchaseTokenHash && (
            <div>
              <p className="text-xs text-xo-muted mb-1">Purchase Token Hash</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs text-xo-muted break-all">{order.purchaseTokenHash}</p>
                <CopyButton value={order.purchaseTokenHash} label="token hash" size="xs" stopPropagation />
              </div>
            </div>
          )}

          {(order.error || order.errorCode) && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs text-red-400 font-medium mb-1">Error</p>
              {order.errorCode && <p className="font-mono text-[10px] text-red-400/80">{order.errorCode}</p>}
              {order.error && <p className="text-xs text-red-300/80">{String(order.error)}</p>}
            </div>
          )}

          <div>
            <p className="text-xs text-xo-muted mb-1">Doc ID</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-[10px] text-xo-muted/70 break-all">{order.id}</p>
              <CopyButton value={order.id} label="doc id" size="xs" stopPropagation />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LegacyTxRow({ tx, isDuplicate }: { tx: IAPTransaction; isDuplicate?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const txAmount = Number(tx.amount);
  const showRealAmount = Number.isFinite(txAmount) && txAmount > 0;

  if (isDuplicate) return null;

  return (
    <div className="group mb-1.5 mx-3 opacity-70">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-start transition-all duration-200 rounded-2xl cursor-pointer hover:bg-xo-cyan/[0.04] bg-xo-bg-soft/40"
      >
        <IconBadge icon={Package} variant="neutral" size="sm" hex />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-medium text-xo-muted">Legacy Purchase</p>
            <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] text-xo-muted">legacy</span>
          </div>
          <p className="font-mono text-[10px] text-xo-muted/70 mt-0.5">
            {formatDate(iapTransactionDisplayTime(tx))} · {tx.email || tx.uid || '—'}
          </p>
        </div>

        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {(tx.coinsAdded ?? 0) > 0 && (
            <span className="font-orbitron text-xs font-bold text-xo-muted">
              +{(tx.coinsAdded ?? 0).toLocaleString()} coins
            </span>
          )}
          {showRealAmount && (
            <span className="text-[10px] text-green-400">{formatCurrency(txAmount)}</span>
          )}
        </div>

        <ChevronDown
          size={14}
          className={`text-xo-muted/70 transition-all duration-200 ml-2 ${
            expanded ? 'rotate-180 text-xo-cyan/40' : 'group-hover:text-xo-cyan/40'
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-1 mx-3 rounded-2xl bg-xo-panel/70 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-xo-muted mb-1">Account</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-xs text-neon-cyan break-all">{tx.email || tx.uid || '—'}</p>
                {(tx.email || tx.uid) && (
                  <CopyButton value={String(tx.email || tx.uid)} label="account" size="xs" stopPropagation />
                )}
              </div>
            </div>
            {tx.productId && (
              <div>
                <p className="text-xs text-xo-muted mb-1">Product ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-xo-muted break-all">{tx.productId}</p>
                  <CopyButton value={tx.productId} label="product id" size="xs" stopPropagation />
                </div>
              </div>
            )}
            {tx.orderId && (
              <div>
                <p className="text-xs text-xo-muted mb-1">Order ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs text-xo-muted break-all">{tx.orderId}</p>
                  <CopyButton value={tx.orderId} label="order id" size="xs" stopPropagation />
                </div>
              </div>
            )}
            {showRealAmount && (
              <div>
                <p className="text-xs text-xo-muted mb-1">Amount</p>
                <p className="font-orbitron text-sm text-green-400">{formatCurrency(txAmount)}</p>
              </div>
            )}
            {tx.status && (
              <div>
                <p className="text-xs text-xo-muted mb-1">Status</p>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(tx.status)}`}>
                  {tx.status}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const FILTER_OPTIONS: { value: TxFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'coins', label: 'Coins' },
  { value: 'avatars', label: 'Avatars' },
  { value: 'grant_success', label: 'Successful Grants' },
  { value: 'failed', label: 'Failed After Payment' },
  { value: 'already_processed', label: 'Already Processed' },
  { value: 'legacy', label: 'Legacy Records' },
  { value: 'noise', label: 'Debug/Noise' },
];

export function TransactionsPage() {
  const { t } = useLanguage();
  const purchaseOrders = useDataStore((s) => s.purchaseOrders);
  const purchaseOrdersLoading = useDataStore((s) => s.purchaseOrdersLoading);
  const purchaseOrdersError = useDataStore((s) => s.purchaseOrdersError);
  const transactions = useDataStore((s) => s.transactions);
  const transactionsLoading = useDataStore((s) => s.transactionsLoading);
  const [activeFilter, setActiveFilter] = useState<TxFilter>('all');
  const [showNoise, setShowNoise] = useState(false);

  const loading = purchaseOrdersLoading || transactionsLoading;

  // Build set of known orderIds and purchaseTokenHashes from purchase_orders for dedup
  const knownOrderIds = useMemo(() => {
    const ids = new Set<string>();
    const tokenHashes = new Set<string>();
    for (const o of purchaseOrders) {
      if (o.orderId) ids.add(o.orderId);
      if (o.purchaseTokenHash) tokenHashes.add(o.purchaseTokenHash);
    }
    return { ids, tokenHashes };
  }, [purchaseOrders]);

  const isLegacyDuplicate = (tx: IAPTransaction) => {
    if (tx.orderId && knownOrderIds.ids.has(tx.orderId)) return true;
    if (tx.purchaseTokenHash && knownOrderIds.tokenHashes.has(tx.purchaseTokenHash)) return true;
    return false;
  };

  const combined = useMemo<CombinedEntry[]>(() => {
    const entries: CombinedEntry[] = [];

    for (const o of purchaseOrders) {
      if (!showNoise && isNoisePurchaseOrder(o)) continue;
      entries.push({ kind: 'order', data: o });
    }

    for (const tx of transactions) {
      const isDup = isLegacyDuplicate(tx);
      if (!isDup) {
        entries.push({ kind: 'legacy', data: tx, isDuplicate: false });
      }
    }

    entries.sort((a, b) => {
      const ta = a.kind === 'order'
        ? toMs(purchaseOrderDisplayTime(a.data))
        : toMs(iapTransactionDisplayTime(a.data));
      const tb = b.kind === 'order'
        ? toMs(purchaseOrderDisplayTime(b.data))
        : toMs(iapTransactionDisplayTime(b.data));
      return tb - ta;
    });

    return entries;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrders, transactions, showNoise]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return combined;
    return combined.filter((entry) => {
      if (activeFilter === 'legacy') return entry.kind === 'legacy';
      if (activeFilter === 'noise') return entry.kind === 'order' && isNoisePurchaseOrder(entry.data);
      if (entry.kind === 'legacy') return false;
      const o = entry.data;
      if (activeFilter === 'coins') return o.productType !== 'avatar';
      if (activeFilter === 'avatars') return o.productType === 'avatar';
      if (activeFilter === 'grant_success') return o.status === 'grant_success' || o.status === 'avatar_unlock_success';
      if (activeFilter === 'failed') return o.status === 'verification_failed' || o.status === 'grant_failed';
      if (activeFilter === 'already_processed') return o.status === 'already_processed';
      return true;
    });
  }, [combined, activeFilter]);

  // Revenue from purchase_orders only — real money fields
  const revenue = useMemo(() => {
    let sum = 0;
    let hasReal = false;
    for (const o of purchaseOrders) {
      if (!isRealPurchaseOrder(o)) continue;
      const r = purchaseOrderRevenue(o);
      if (r !== null) {
        sum += r;
        hasReal = true;
      }
    }
    // Also check legacy transactions
    for (const tx of transactions) {
      const n = Number(tx.amount);
      if (Number.isFinite(n) && n > 0 && !isLegacyDuplicate(tx)) {
        sum += n;
        hasReal = true;
      }
    }
    return { sum, hasReal };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrders, transactions]);

  const stats = useMemo(() => {
    let successCount = 0;
    let avatarCount = 0;
    let failedCount = 0;
    let alreadyProcessedCount = 0;
    let totalCoins = 0;
    for (const o of purchaseOrders) {
      if (!isRealPurchaseOrder(o)) continue;
      if (o.status === 'grant_success') { successCount++; totalCoins += purchaseOrderCoins(o); }
      if (o.status === 'avatar_unlock_success') { avatarCount++; successCount++; }
      if (o.status === 'verification_failed' || o.status === 'grant_failed') failedCount++;
      if (o.status === 'already_processed') alreadyProcessedCount++;
    }
    return { successCount, avatarCount, failedCount, alreadyProcessedCount, totalCoins };
  }, [purchaseOrders]);

  const permissionDenied = purchaseOrdersError?.message?.includes('permission-denied');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-orbitron text-xl font-bold text-xo-text">Transactions</h1>
        <p className="mt-1 text-xs text-xo-muted">Purchases, legacy records, manual adjustments, failures, duplicates, and debug noise separated clearly.</p>
      </div>

      {permissionDenied && (
        <ErrorState
          title="Permission denied — purchase_orders"
          message="Admin account cannot read the purchase_orders collection."
          hint="Update Firestore rules so isAdmin() can read purchase_orders."
        />
      )}
      {purchaseOrdersError && !permissionDenied && (
        <ErrorState
          title="Purchase orders error"
          message={purchaseOrdersError.message}
          hint="Check Firestore indexes: purchase_orders requires a createdAt index for orderBy."
        />
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <GlassCard>
          <div className="p-4">
            <IconBadge icon={ShieldCheck} variant="purchase" size="md" hex className="mb-2" />
            <p className="font-orbitron text-xl font-bold text-xo-text">{stats.successCount}</p>
            <p className="text-[10px] text-xo-muted">Successful Grants</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-4">
            <IconBadge icon={ShoppingCart} variant="coins" size="md" hex className="mb-2" />
            <p className="font-orbitron text-xl font-bold text-xo-text">{stats.totalCoins.toLocaleString()}</p>
            <p className="text-[10px] text-xo-muted">Total Coins Granted</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-4">
            <IconBadge icon={XCircle} variant="failed" size="md" hex className="mb-2" />
            <p className="font-orbitron text-xl font-bold text-xo-text">{stats.failedCount}</p>
            <p className="text-[10px] text-xo-muted">Failed After Payment</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="p-4">
            <IconBadge icon={RefreshCw} variant="duplicate" size="md" hex className="mb-2" />
            <p className="font-orbitron text-xl font-bold text-xo-text">{stats.alreadyProcessedCount}</p>
            <p className="text-[10px] text-xo-muted">Duplicates Prevented</p>
          </div>
        </GlassCard>
      </div>

      {/* Revenue — only when real amount data exists */}
      {revenue.hasReal ? (
        <GlassCard>
          <div className="flex items-center gap-4 p-5">
            <IconBadge icon={DollarSign} variant="revenue" size="lg" hex />
            <div>
              <p className="text-sm text-xo-muted">{t('totalRevenue')}</p>
              <p className="font-orbitron text-2xl font-bold text-green-400">{formatCurrency(revenue.sum)}</p>
            </div>
            <div className="ms-auto text-right">
              <p className="text-xs text-xo-muted">{purchaseOrders.length} purchase orders</p>
              <p className="text-[10px] text-xo-muted/70">{transactions.length} legacy records</p>
            </div>
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="flex items-center gap-4 p-4">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-400/80">
              Revenue unavailable — no trusted amount field in purchase documents. Revenue is never estimated from coins.
            </p>
          </div>
        </GlassCard>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setActiveFilter(f.value)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              activeFilter === f.value
                ? 'bg-xo-cyan text-xo-bg-deep shadow-[0_0_18px_rgba(85,214,255,0.2)]'
                : 'bg-xo-panel/60 border border-xo-border text-xo-muted hover:text-xo-text hover:border-xo-border-active'
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowNoise((v) => !v)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all border ${
            showNoise
              ? 'bg-gray-500/20 border-gray-500/40 text-xo-text/80'
              : 'bg-xo-bg-soft/50 border-glass-border text-xo-muted hover:text-xo-text/80'
          }`}
        >
          {showNoise ? <EyeOff size={11} /> : <Eye size={11} />}
          {showNoise ? 'Hide noise' : 'Show debug/noise'}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-xo-muted">{t('noData')}</p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <p className="text-[11px] text-xo-muted">
              {filtered.length} records
              {filtered.length !== combined.length && ` (filtered from ${combined.length})`}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {filtered.map((entry) => {
              if (entry.kind === 'order') {
                return <OrderRow key={`po:${entry.data.id}`} order={entry.data} />;
              }
              return (
                <LegacyTxRow
                  key={`tx:${entry.data.id}`}
                  tx={entry.data}
                  isDuplicate={entry.isDuplicate}
                />
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
