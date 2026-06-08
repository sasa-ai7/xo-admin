import { useMemo, useState } from 'react';
import {
  ChevronDown,
  AlertTriangle,
  DollarSign,
  Eye,
  EyeOff,
  Image,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useDataStore } from '../../stores/dataStore';
import { useUsers } from '../../hooks/useUsers';
import { useLanguage } from '../../i18n/LanguageContext';
import { GlassCard } from '../shared/GlassCard';
import { StatCard } from '../shared/StatCard';
import { Badge } from '../shared/Badge';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { CopyButton } from '../shared/CopyButton';
import { ErrorState } from '../shared/ErrorState';
import { PageHeader } from '../shared/PageHeader';
import { SearchInput } from '../shared/SearchInput';
import { FilterChip, ChipGroup } from '../shared/FilterChip';
import { PurchaseStatusBadge } from '../shared/PurchaseStatusBadge';
import { IconBadge, type IconBadgeVariant } from '../shared/IconBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import type { en } from '../../i18n/en';
import {
  purchaseOrderDisplayTime,
  purchaseOrderCoins,
  purchaseOrderNormalizedUsd,
  purchaseOrderRevenue,
  isRealPurchaseOrder,
  isNoisePurchaseOrder,
  shouldCountForRevenue,
  COINS_PER_USD,
  type PurchaseOrder,
} from '../../types/purchaseOrder';

type LabelKey = keyof typeof en;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type PoFilter = 'all' | 'real' | 'coins' | 'avatars' | 'grant_success' | 'failed' | 'already_processed' | 'today' | 'last7d' | 'deleted_users';
type PoPlatform = 'all' | 'android' | 'ios';

function tsMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try { return (value as { toDate(): Date }).toDate().getTime(); } catch { return 0; }
  }
  return 0;
}

function OrderCard({ order, isDeletedUser }: { order: PurchaseOrder; isDeletedUser: boolean }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const coins = purchaseOrderCoins(order);
  const normUsd = purchaseOrderNormalizedUsd(order);
  const gpRevenue = purchaseOrderRevenue(order);
  const isNoise = isNoisePurchaseOrder(order);
  const isReal = isRealPurchaseOrder(order);
  const isRevenueCounted = shouldCountForRevenue(order);
  const isAvatar = order.productType === 'avatar';
  const isUnverified = isReal && !isNoise && !order.verified && !order.trustedRevenue;
  const iconVariant: IconBadgeVariant = isNoise
    ? 'neutral'
    : isAvatar
      ? 'avatar'
      : order.status === 'already_processed'
        ? 'duplicate'
        : order.status === 'verification_failed' || order.status === 'grant_failed'
          ? 'failed'
          : 'purchase';
  const displayName = order.displayName ?? order.userDisplayNameSnapshot ?? null;
  const email = order.email ?? order.userEmailSnapshot ?? null;

  const safeJson = useMemo(() => {
    const safe: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(order)) {
      if (k === 'purchaseToken' || k === 'rawPurchaseToken') continue;
      safe[k] = v;
    }
    return JSON.stringify(safe, null, 2);
  }, [order]);

  return (
    <div className={`mb-2 rounded-2xl border bg-xo-bg-soft/45 ${isNoise ? 'border-xo-border/30 opacity-60' : 'border-xo-border/60'}`}>
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-start gap-3 px-4 py-3 text-start">
        <IconBadge icon={isAvatar ? Image : ShoppingCart} variant={iconVariant} size="sm" hex className="mt-0.5" pulse={order.status === 'grant_success'} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PurchaseStatusBadge status={order.status} />
            {order.verified && (
              <Badge variant="cyan"><ShieldCheck size={9} className="me-1" />{t('verifiedLabel')}</Badge>
            )}
            {order.trustedRevenue && <Badge variant="green">{t('trustedLabel')}</Badge>}
            {isUnverified && <Badge variant="amber">{t('unverifiedLabel')}</Badge>}
            {isRevenueCounted && order.status !== 'grant_success' && order.status !== 'avatar_unlock_success' && (
              <Badge variant="green">{t('revenueCounted')}</Badge>
            )}
            {isNoise && <Badge variant="gray">{t('poDebugNoise')}</Badge>}
            {isAvatar && <Badge variant="purple">{t('avatarLabel')}</Badge>}
            {isDeletedUser && (
              <Badge variant="amber"><Trash2 size={8} className="me-1" />{t('deletedUserLabel')}</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-xo-muted">
            <span>{formatDate(purchaseOrderDisplayTime(order))}</span>
            {displayName && <span className="text-xo-text/80">{displayName}</span>}
            {email && <span className="text-neon-cyan/80">{email}</span>}
            {!email && order.uid && <span className="font-mono text-xo-muted">{order.uid.slice(0, 12)}…</span>}
            {order.productId && <span className="font-mono">{order.productId}</span>}
            {order.platform && <span>{order.platform}</span>}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {coins > 0 && <span className="font-orbitron text-xs font-bold text-coin">+{coins.toLocaleString()}</span>}
          {isNoise && <span className="text-[10px] font-semibold text-xo-muted">{t('notCharged')}</span>}
          {normUsd > 0 && <span className="text-[10px] text-emerald-400">{formatCurrency(normUsd)}</span>}
          <ChevronDown size={13} className={`mt-1 text-xo-muted/70 transition-all ${expanded ? 'rotate-180 text-xo-cyan/50' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-glass-border/30 px-4 py-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {order.uid && (
              <Field label="UID">
                <span className="break-all font-mono text-xo-text/80">{order.uid}</span>
                <CopyButton value={order.uid} label="UID" size="xs" stopPropagation />
              </Field>
            )}
            {email && (
              <Field label={t('email')}>
                <span className="break-all font-mono text-neon-cyan">{email}</span>
                <CopyButton value={email} label="email" size="xs" stopPropagation />
              </Field>
            )}
            {displayName && (
              <Field label={t('displayNameLabel')}>
                <span className="break-all font-mono text-xo-text/80">{displayName}</span>
              </Field>
            )}
            {order.productId && (
              <Field label={t('productId')}>
                <span className="break-all font-mono text-xo-text/80">{order.productId}</span>
                <CopyButton value={order.productId} label="product id" size="xs" stopPropagation />
              </Field>
            )}
            {order.orderId && (
              <Field label={t('orderId')}>
                <span className="break-all font-mono text-xo-text/80">{order.orderId}</span>
                <CopyButton value={order.orderId} label="order id" size="xs" stopPropagation />
              </Field>
            )}
            {order.purchaseTokenHash && (
              <Field label={t('tokenHash')}>
                <span className="break-all font-mono text-[10px] text-xo-muted">{order.purchaseTokenHash}</span>
                <CopyButton value={order.purchaseTokenHash} label="token hash" size="xs" stopPropagation />
              </Field>
            )}
            {coins > 0 && (
              <Field label={t('coinsGranted')}>
                <span className="font-orbitron text-coin">+{coins.toLocaleString()}</span>
              </Field>
            )}
            {normUsd > 0 && (
              <Field label={t('normalizedUsd')}>
                <span className="font-orbitron text-emerald-400">{formatCurrency(normUsd)}</span>
                <span className="ms-2 text-[9px] text-xo-muted/70">{coins} ÷ {COINS_PER_USD}</span>
              </Field>
            )}
            {order.googlePlayPriceLabel && (
              <Field label={t('googlePlayPrice')}>
                <span className="font-mono text-xo-text/80">{order.googlePlayPriceLabel}{order.googlePlayCurrencyCode ? ` (${order.googlePlayCurrencyCode})` : ''}</span>
              </Field>
            )}
            {gpRevenue !== null && !order.googlePlayPriceLabel && (
              <Field label={t('gpAmount')}>
                <span className="font-mono text-xo-text/80">{formatCurrency(gpRevenue)}</span>
              </Field>
            )}
            {order.balanceBefore !== undefined && order.balanceAfter !== undefined && (
              <Field label={t('balanceLabel')}>
                <span className="font-mono text-xo-text/80">
                  {Number(order.balanceBefore).toLocaleString()} → {Number(order.balanceAfter).toLocaleString()}
                </span>
              </Field>
            )}
            {order.platform && (
              <Field label={t('platform')}>
                <span className="font-mono text-xo-text/80">{order.platform}</span>
              </Field>
            )}
            {order.appVersion && (
              <Field label={t('appVersion')}>
                <span className="font-mono text-xo-text/80">{order.appVersion}</span>
              </Field>
            )}
            {isAvatar && order.avatarId !== undefined && (
              <Field label={t('avatarIdLabel')}>
                <span className="font-mono text-xo-violet">{String(order.avatarId)}</span>
              </Field>
            )}
          </div>

          {(order.error || order.errorCode) && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <p className="mb-1 text-xs font-medium text-red-400">{t('errorLabel')}</p>
              {order.errorCode && <p className="font-mono text-[10px] text-red-400/80">{String(order.errorCode)}</p>}
              {order.error && <p className="text-xs text-red-300/80">{String(order.error)}</p>}
            </div>
          )}

          <details className="group">
            <summary className="cursor-pointer select-none text-[10px] text-xo-muted/70 hover:text-xo-muted">
              {t('rawJsonSafe')}
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-xo-bg-deep/60 p-3 text-[10px] break-all whitespace-pre-wrap text-xo-muted">
              {safeJson}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xo-muted">{label}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

const FILTER_OPTIONS: { value: PoFilter; key: LabelKey }[] = [
  { value: 'all', key: 'filterAll' },
  { value: 'real', key: 'realPurchases' },
  { value: 'today', key: 'today' },
  { value: 'last7d', key: 'last7dPurchases' },
  { value: 'coins', key: 'coins' },
  { value: 'avatars', key: 'avatars' },
  { value: 'grant_success', key: 'successfulGrants' },
  { value: 'failed', key: 'failedAfterPayment' },
  { value: 'already_processed', key: 'alreadyProcessed' },
  { value: 'deleted_users', key: 'deletedUsers' },
];

export function PurchaseOrdersPage() {
  const { t } = useLanguage();
  const purchaseOrders = useDataStore((s) => s.purchaseOrders);
  const loading = useDataStore((s) => s.purchaseOrdersLoading);
  const error = useDataStore((s) => s.purchaseOrdersError);
  const { data: users } = useUsers();

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<PoFilter>('real');
  const [platformFilter, setPlatformFilter] = useState<PoPlatform>('all');
  const [showNoise, setShowNoise] = useState(false);

  const activeUids = useMemo(() => new Set(users.map((u) => u.id)), [users]);
  const isDeletedUser = (uid: string | undefined) => Boolean(uid && activeUids.size > 0 && !activeUids.has(uid));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const now = Date.now();
    return purchaseOrders.filter((o) => {
      if (!showNoise && isNoisePurchaseOrder(o)) return false;
      if (activeFilter === 'real' && !isRealPurchaseOrder(o)) return false;
      if (activeFilter === 'coins' && o.productType === 'avatar') return false;
      if (activeFilter === 'avatars' && o.productType !== 'avatar') return false;
      if (activeFilter === 'grant_success' && o.status !== 'grant_success' && o.status !== 'avatar_unlock_success') return false;
      if (activeFilter === 'failed' && o.status !== 'verification_failed' && o.status !== 'grant_failed') return false;
      if (activeFilter === 'already_processed' && o.status !== 'already_processed') return false;
      if (activeFilter === 'today') {
        const ts = tsMs(o.createdAt ?? o.purchasedAt);
        if (ts === 0 || now - ts > ONE_DAY_MS) return false;
      }
      if (activeFilter === 'last7d') {
        const ts = tsMs(o.createdAt ?? o.purchasedAt);
        if (ts === 0 || now - ts > 7 * ONE_DAY_MS) return false;
      }
      if (activeFilter === 'deleted_users' && !isDeletedUser(o.uid)) return false;
      if (platformFilter !== 'all' && o.platform !== platformFilter) return false;
      if (term) {
        const haystack = [
          o.uid, o.email, o.userEmailSnapshot, o.displayName, o.userDisplayNameSnapshot,
          o.orderId, o.productId, o.purchaseTokenHash, o.id,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrders, search, activeFilter, platformFilter, showNoise, activeUids]);

  const permissionDenied = error?.message?.includes('permission-denied') || (error as { code?: string } | null)?.code === 'permission-denied';

  const stats = useMemo(() => {
    let successCount = 0;
    let totalCoins = 0;
    let avatarCount = 0;
    let failedCount = 0;
    let normalizedRevenue = 0;
    let deletedUserCount = 0;
    for (const o of purchaseOrders) {
      const isReal = isRealPurchaseOrder(o);
      const countRevenue = shouldCountForRevenue(o);
      if (!isReal && !countRevenue) continue;
      if (o.uid && isDeletedUser(o.uid)) deletedUserCount++;
      if (o.status === 'grant_success') { successCount++; totalCoins += purchaseOrderCoins(o); }
      if (o.status === 'avatar_unlock_success') { avatarCount++; successCount++; }
      if (o.status === 'verification_failed' || o.status === 'grant_failed') failedCount++;
      if (countRevenue) normalizedRevenue += purchaseOrderNormalizedUsd(o);
    }
    return { successCount, totalCoins, avatarCount, failedCount, normalizedRevenue, deletedUserCount };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseOrders, activeUids]);

  return (
    <div className="space-y-4">
      <PageHeader icon={ShoppingBag} variant="purchase" title={t('purchaseOrders')} subtitle={t('purchaseOrdersSubtitle')} />

      {permissionDenied && (
        <ErrorState title={t('permissionDeniedPOTitle')} message={t('permissionDeniedPOMsg')} hint={t('permissionDeniedPOHint')} />
      )}
      {error && !permissionDenied && (
        <ErrorState title={t('errorLoadingPO')} message={error.message} hint={t('errorLoadingPOHint')} />
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={ShieldCheck} variant="purchase" label={t('successfulGrants')} value={stats.successCount} />
        <StatCard icon={ShoppingCart} variant="coins" label={t('coinsGranted')} value={stats.totalCoins} />
        <StatCard icon={DollarSign} variant="revenue" label={t('normalizedRevenue')} value={stats.normalizedRevenue} format={formatCurrency} hint={`${COINS_PER_USD} ${t('coins')} = $1`} />
        <StatCard icon={Image} variant="avatar" label={t('avatarUnlocks')} value={stats.avatarCount} />
        <StatCard icon={AlertTriangle} variant="failed" label={t('failedAfterPayment')} value={stats.failedCount} />
        <StatCard icon={Trash2} variant="deletion" label={t('deletedUserRecords')} value={stats.deletedUserCount} />
      </div>

      {/* Search + filters */}
      <div className="space-y-2.5">
        <SearchInput value={search} onChange={setSearch} placeholder={t('searchPurchaseOrders')} />
        <div className="flex flex-wrap items-center gap-2">
          <ChipGroup>
            {FILTER_OPTIONS.map((f) => (
              <FilterChip key={f.value} active={activeFilter === f.value} onClick={() => setActiveFilter(f.value)}>
                {t(f.key)}
              </FilterChip>
            ))}
            {(['all', 'android', 'ios'] as PoPlatform[]).map((p) => (
              <FilterChip key={p} active={platformFilter === p} onClick={() => setPlatformFilter(p)}>
                {p === 'all' ? t('allPlatforms') : p}
              </FilterChip>
            ))}
          </ChipGroup>
          <FilterChip
            className="ms-auto"
            active={showNoise}
            icon={showNoise ? EyeOff : Eye}
            onClick={() => setShowNoise((v) => !v)}
          >
            {showNoise ? t('hideNoise') : t('showDebugNoise')}
          </FilterChip>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <ShoppingCart size={24} className="text-xo-muted/70" />
            <p className="text-sm text-xo-muted">{t('noPurchaseOrdersMatch')}</p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="px-5 pt-4 pb-2">
            <p className="text-[11px] text-xo-muted">{filtered.length} {t('records')}</p>
          </div>
          <div className="px-3 pb-3">
            {filtered.map((o) => (
              <OrderCard key={o.id} order={o} isDeletedUser={isDeletedUser(o.uid)} />
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
