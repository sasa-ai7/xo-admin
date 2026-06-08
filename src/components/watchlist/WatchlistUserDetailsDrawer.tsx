import { useState } from 'react';
import {
  User, ShoppingCart, Receipt, Terminal, ShieldAlert, Coins, Gamepad2,
  Wifi, WifiOff, Share2, Trash2, RotateCcw,
} from 'lucide-react';
import type { AppUser } from '../../types/user';
import type { WatchlistChargeOverride } from '../../types/watchlist';
import { useLanguage } from '../../i18n/LanguageContext';
import { DetailsDrawer } from '../shared/DetailsDrawer';
import { ResponsiveTabs, type ResponsiveTabOption } from '../activity/ResponsiveTabs';
import { UserAvatar } from '../shared/UserAvatar';
import { CopyButton } from '../shared/CopyButton';
import { Badge } from '../shared/Badge';
import { PurchaseStatusBadge } from '../shared/PurchaseStatusBadge';
import { usePurchaseOrdersForUser } from '../../hooks/usePurchaseOrdersForUser';
import { useWalletLedgerForUser } from '../../hooks/useWalletLedgerForUser';
import { useUserLogsForUser } from '../../hooks/useUserLogsForUser';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { formatRelativeTime } from '../../utils/relativeTime';
import { isUserOnline, getUserLastSeenValue } from '../../utils/userPresence';
import {
  purchaseOrderCoins, purchaseOrderNormalizedUsd, purchaseOrderDisplayTime,
} from '../../types/purchaseOrder';
import { computeUserCharge, isBeforeReset } from '../../utils/watchlistAnalytics';

type Tab = 'overview' | 'purchases' | 'transactions' | 'logs' | 'admin';

interface Props {
  user: AppUser | null;
  override?: WatchlistChargeOverride | null;
  onClose: () => void;
  onResetUser: (user: AppUser) => void;
  onRemoveFromFolder: (uid: string) => void;
}

export function WatchlistUserDetailsDrawer({ user, override, onClose, onResetUser, onRemoveFromFolder }: Props) {
  return (
    <DetailsDrawer
      open={user != null}
      onClose={onClose}
      title={user?.Profile?.name ?? user?.Profile?.displayName ?? user?.Profile?.email ?? 'User'}
      subtitle={user?.Profile?.email ?? user?.id}
      width="lg"
    >
      {user && (
        <DrawerBody
          user={user}
          override={override}
          onResetUser={onResetUser}
          onRemoveFromFolder={onRemoveFromFolder}
        />
      )}
    </DetailsDrawer>
  );
}

function DrawerBody({ user, override, onResetUser, onRemoveFromFolder }: {
  user: AppUser;
  override?: WatchlistChargeOverride | null;
  onResetUser: (user: AppUser) => void;
  onRemoveFromFolder: (uid: string) => void;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const targetUid = user.uid ?? user.id;

  const { data: orders, loading: ordersLoading } = usePurchaseOrdersForUser(targetUid);
  const { data: ledger, loading: ledgerLoading } = useWalletLedgerForUser(targetUid);
  const { data: logs, loading: logsLoading } = useUserLogsForUser(targetUid, {
    liveLimit: 100,
    pageSize: 100,
    docIdFallback: user.id,
  });

  const charge = computeUserCharge(orders, override);
  const online = isUserOnline(user);

  const tabs: ResponsiveTabOption<Tab>[] = [
    { value: 'overview', label: t('overview'), icon: User },
    { value: 'purchases', label: t('purchases'), icon: ShoppingCart },
    { value: 'transactions', label: t('transactions'), icon: Receipt },
    { value: 'logs', label: t('accountLogs'), icon: Terminal },
    { value: 'admin', label: t('adminActions'), icon: ShieldAlert },
  ];

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="xo-card xo-rim flex items-center gap-3 p-4">
        <UserAvatar
          photoURL={user.Profile?.photoURL}
          equippedAvatar={user.Cosmetics?.equippedAvatar}
          displayName={user.Profile?.displayName ?? user.Profile?.name}
          size="lg"
          online={online}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-xo-text">
            {user.Profile?.name ?? user.Profile?.displayName ?? 'No name'}
          </p>
          <p className="truncate text-xs text-xo-cyan">{user.Profile?.email ?? user.id}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="truncate font-mono text-[10px] text-xo-muted">{targetUid}</span>
            <CopyButton value={targetUid} label="UID" />
          </div>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${online ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-xo-muted'}`}>
          {online ? <Wifi size={10} /> : <WifiOff size={10} />}
          {online ? t('online') : t('offline')}
        </span>
      </div>

      <ResponsiveTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Metric icon={<Coins size={13} />} label={t('coins')} value={(user.Wallet?.coins ?? 0).toLocaleString()} tone="coin" />
            <Metric icon={<Gamepad2 size={13} />} label={t('gamesPlayed')} value={String(user.Stats?.gamesPlayed ?? 0)} tone="cyan" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric label={t('wins')} value={String(user.Stats?.gamesWon ?? 0)} tone="green" />
            <Metric label={t('gamesLost')} value={String(user.Stats?.gamesLost ?? 0)} tone="red" />
            <Metric label={t('draw')} value={String(user.Stats?.gamesDrawn ?? 0)} tone="amber" />
          </div>

          {/* Revenue with reset checkpoint */}
          <div className="xo-card p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-xo-muted">{t('historicalRevenue')}</span>
              <span className="font-orbitron text-xo-text/80">{formatCurrency(charge.historicalUsd)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-xo-muted">{t('displayedRevenue')}</span>
              <span className="font-orbitron font-bold text-emerald-400">{formatCurrency(charge.displayedUsd)}</span>
            </div>
            {charge.resetAtMs && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                <RotateCcw size={9} /> {t('resetCheckpoint')}: {formatDate(charge.resetAtMs)}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-[11px]">
            <Row label={t('provider')} value={user.Profile?.provider ?? '—'} />
            <Row label={t('status')} value={user.deleted ? t('deletedUser') : user.banned ? 'Banned' : user.suspended ? 'Suspended' : t('active')} />
            <Row label={online ? t('online') : t('lastSeen')} value={online ? t('online') : formatRelativeTime(getUserLastSeenValue(user))} />
            <Row label={t('joined')} value={user.createdAt ? formatDate(user.createdAt) : '—'} />
            <Row label={t('inviteCode')} value={user.inviteCode || user.referralCode || '—'} mono />
          </div>
        </div>
      )}

      {tab === 'purchases' && (
        <TabBody loading={ordersLoading} empty={orders.length === 0} emptyText={t('noPurchases')}>
          {orders.map((o) => {
            const before = isBeforeReset(o, override);
            return (
              <div key={o.id} className="xo-card p-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <PurchaseStatusBadge status={o.status} />
                  {o.verified && <Badge variant="cyan">{t('verifiedLabel')}</Badge>}
                  {before && <Badge variant="amber">{t('beforeReset')}</Badge>}
                  <span className="ms-auto font-orbitron font-bold text-coin">+{purchaseOrderCoins(o).toLocaleString()}</span>
                  <span className="text-emerald-400">{formatCurrency(purchaseOrderNormalizedUsd(o))}</span>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1 text-[10px] text-xo-muted">
                  {o.productId && <IdRow label={t('productId')} value={o.productId} />}
                  {o.orderId && <IdRow label={t('orderId')} value={o.orderId} />}
                  {typeof o.transactionId === 'string' && o.transactionId && <IdRow label={t('transactionId')} value={o.transactionId} />}
                  {o.purchaseTokenHash && <IdRow label={t('tokenHash')} value={o.purchaseTokenHash} />}
                  <div className="flex justify-between"><span>{t('platform')}</span><span className="text-xo-text/70">{o.platform ?? '—'}</span></div>
                  <div className="flex justify-between"><span>{t('dateTime')}</span><span className="text-xo-text/70">{formatDate(purchaseOrderDisplayTime(o))}</span></div>
                  {(o.error || o.errorCode) && <div className="text-rose-400">{String(o.error ?? o.errorCode)}</div>}
                </div>
              </div>
            );
          })}
        </TabBody>
      )}

      {tab === 'transactions' && (
        <TabBody loading={ledgerLoading} empty={ledger.length === 0} emptyText={t('noTransactions')}>
          {ledger.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-xo-border bg-xo-bg-soft/50 px-3 py-2 text-[11px]">
              <span className="font-mono text-[10px] text-xo-muted">{formatDate(e.createdAt)}</span>
              {(e.coinsAdded ?? 0) !== 0 && (
                <span className={`font-orbitron font-bold ${Number(e.coinsAdded) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {Number(e.coinsAdded) > 0 ? '+' : ''}{Number(e.coinsAdded).toLocaleString()}
                </span>
              )}
              {e.balanceBefore !== undefined && e.balanceAfter !== undefined && (
                <span className="text-xo-muted">{Number(e.balanceBefore).toLocaleString()} → {Number(e.balanceAfter).toLocaleString()}</span>
              )}
              {e.source && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-xo-text/70">{String(e.source)}</span>}
              {e.orderId && (
                <span className="ms-auto flex items-center gap-1 font-mono text-[10px] text-xo-muted">
                  {String(e.orderId).slice(0, 12)}…<CopyButton value={String(e.orderId)} label="order id" />
                </span>
              )}
            </div>
          ))}
        </TabBody>
      )}

      {tab === 'logs' && (
        <TabBody loading={logsLoading} empty={logs.length === 0} emptyText={t('noLogs')}>
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-2 rounded-xl border border-xo-border bg-xo-bg-soft/50 px-3 py-2 text-[11px]">
              <span className="font-mono text-[10px] text-xo-muted">{formatDate(log.timestamp ?? log.createdAt)}</span>
              <span className="font-mono font-bold text-xo-cyan">{log.eventType ?? log.eventName ?? 'event'}</span>
              {log.platform && <span className="ms-auto rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase text-xo-muted">{log.platform}</span>}
            </div>
          ))}
        </TabBody>
      )}

      {tab === 'admin' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4">
            <div className="flex items-center gap-2 text-rose-300">
              <ShieldAlert size={15} />
              <p className="font-orbitron text-xs font-bold">{t('adminActions')}</p>
            </div>
            <p className="mt-1.5 text-[11px] text-xo-muted">{t('resetChargeWarning')}</p>
            <button
              type="button"
              onClick={() => onResetUser(user)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
            >
              <RotateCcw size={13} /> {t('resetThisUser')}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onRemoveFromFolder(user.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-xo-border px-4 py-2 text-xs font-semibold text-xo-muted transition-colors hover:border-rose-500/40 hover:text-rose-400"
          >
            <Trash2 size={13} /> {t('removeFromFolderAction')}
          </button>
          {(user.inviteCode || user.referralCode) && (
            <div className="flex items-center gap-2 rounded-xl border border-xo-border bg-xo-bg-soft/50 px-3 py-2 text-[11px]">
              <Share2 size={12} className="text-xo-violet" />
              <span className="text-xo-muted">{t('referralInfo')}:</span>
              <span className="font-mono text-xo-violet">{user.inviteCode || user.referralCode}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TabBody({ loading, empty, emptyText, children }: { loading: boolean; empty: boolean; emptyText: string; children: React.ReactNode }) {
  if (loading) return <p className="py-8 text-center text-xs text-xo-muted">…</p>;
  if (empty) return <p className="py-8 text-center text-xs text-xo-muted">{emptyText}</p>;
  return <div className="space-y-2">{children}</div>;
}

function Metric({ icon, label, value, tone = 'cyan' }: { icon?: React.ReactNode; label: string; value: string; tone?: 'cyan' | 'coin' | 'green' | 'red' | 'amber' }) {
  const toneClass = {
    cyan: 'text-xo-cyan', coin: 'text-coin', green: 'text-emerald-400', red: 'text-rose-400', amber: 'text-amber-400',
  }[tone];
  return (
    <div className="xo-card p-2.5 text-center">
      <p className={`inline-flex items-center justify-center gap-1 font-orbitron text-base font-bold ${toneClass}`}>{icon}{value}</p>
      <p className="mt-0.5 text-[10px] text-xo-muted">{label}</p>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-xo-border bg-xo-bg-soft/40 px-3 py-1.5">
      <span className="text-xo-muted">{label}</span>
      <span className={mono ? 'font-mono text-xo-violet' : 'text-xo-text/80'}>{value}</span>
    </div>
  );
}

function IdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <span className="truncate font-mono text-xo-text/70" style={{ maxWidth: 180 }}>{value}</span>
        <CopyButton value={value} label={label} />
      </span>
    </div>
  );
}
