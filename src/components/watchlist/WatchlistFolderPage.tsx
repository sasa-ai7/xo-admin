import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, Users, Coins, DollarSign, Wifi, ShoppingBag, XCircle,
  UserPlus, Search, ExternalLink, UserMinus, Folder, RotateCcw, AlertTriangle,
  FileSpreadsheet, FileText, FileJson, FileCode, ChevronDown,
} from 'lucide-react';
import { useAdminWatchlistFolder, useWatchlistFolderActions } from '../../hooks/useAdminWatchlists';
import { useUsers } from '../../hooks/useUsers';
import { useDataStore } from '../../stores/dataStore';
import { useWatchlistOverrides } from '../../hooks/useWatchlistOverrides';
import { useLanguage } from '../../i18n/LanguageContext';
import { GlassCard } from '../shared/GlassCard';
import { StatCard } from '../shared/StatCard';
import { FilterChip, ChipGroup } from '../shared/FilterChip';
import { UserAvatar } from '../shared/UserAvatar';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorState } from '../shared/ErrorState';
import { CopyButton } from '../shared/CopyButton';
import { AdminPasscodeConfirmModal } from '../shared/AdminPasscodeConfirmModal';
import { WatchlistUserDetailsDrawer } from './WatchlistUserDetailsDrawer';
import { formatCurrency } from '../../utils/formatters';
import { formatRelativeTime, toMs } from '../../utils/relativeTime';
import { getUserLastSeenValue } from '../../utils/userPresence';
import { isRealPurchaseOrder, purchaseOrderDisplayTime } from '../../types/purchaseOrder';
import type { PurchaseOrder } from '../../types/purchaseOrder';
import type { AppUser } from '../../types/user';
import { computeUserCharge, isSuspiciousUser } from '../../utils/watchlistAnalytics';
import { exportWatchlist, type ExportFormat, type ExportScope } from '../../utils/exporters';
import {
  applyWatchlistChargeReset, logWatchlistExport, logWatchlistAdminAction, type ChargeResetTarget,
} from '../../services/watchlistReset';
import { cn } from '../../utils/cn';

const ONE_DAY_MS = 86_400_000;

type SortKey = 'online' | 'newest' | 'oldest' | 'lastActive' | 'coins' | 'charged' | 'purchases' | 'games' | 'suspicious';
type FolderFilter = 'all' | 'online' | 'offline' | 'hasPurchases' | 'noPurchases' | 'suspicious';

// ── Add Users modal ──────────────────────────────────────────────────────────
function AddUsersModal({ folderUserIds, onAdd, onClose }: {
  folderUserIds: Set<string>;
  onAdd: (uid: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { data: allUsers } = useUsers();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allUsers
      .filter((u) => !folderUserIds.has(u.id))
      .filter((u) => {
        if (!q) return true;
        return (
          (u.Profile?.email ?? '').toLowerCase().includes(q) ||
          (u.Profile?.displayName ?? u.Profile?.name ?? '').toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
        );
      })
      .slice(0, 50);
  }, [allUsers, folderUserIds, query]);

  async function handleAdd(uid: string) {
    setAdding(uid);
    try { await onAdd(uid); } finally { setAdding(null); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="xo-bezel relative z-10 flex w-full max-w-md flex-col rounded-2xl" style={{ maxHeight: '80vh' }}>
        <div className="flex items-center gap-3 border-b border-xo-border p-4">
          <UserPlus size={16} className="text-xo-cyan" />
          <h2 className="font-orbitron text-sm font-bold text-xo-text">{t('addUsers')}</h2>
          <button type="button" onClick={onClose} className="ms-auto text-xo-muted hover:text-xo-text">
            <XCircle size={16} />
          </button>
        </div>
        <div className="p-3">
          <div className="relative">
            <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-xo-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchUsers')}
              className="w-full rounded-xl border border-xo-border bg-xo-bg-soft/60 py-2 ps-8 pe-3 text-xs text-xo-text outline-none focus:border-xo-border-active"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-[11px] text-xo-muted">{t('noResults')}</p>
          ) : (
            <div className="space-y-1">
              {candidates.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-white/5">
                  <UserAvatar photoURL={u.Profile?.photoURL} displayName={u.Profile?.displayName ?? u.Profile?.name} size="sm" online={u.online} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-xo-text">{u.Profile?.name ?? u.Profile?.displayName ?? t('noData')}</p>
                    <p className="truncate text-[10px] text-xo-muted">{u.Profile?.email ?? u.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { void handleAdd(u.id); }}
                    disabled={adding === u.id}
                    className="rounded-lg bg-xo-cyan/10 px-2 py-1 text-[10px] font-bold text-xo-cyan hover:bg-xo-cyan/20 disabled:opacity-50"
                  >
                    {adding === u.id ? '…' : t('add')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Export panel ─────────────────────────────────────────────────────────────
function ExportPanel({ onExport }: { onExport: (format: ExportFormat, scope: ExportScope) => void }) {
  const { t } = useLanguage();
  const [scope, setScope] = useState<ExportScope>('full');
  const [menuOpen, setMenuOpen] = useState(false);

  const fmtButtons: { format: ExportFormat; label: string; icon: typeof FileSpreadsheet }[] = [
    { format: 'xlsx', label: t('exportExcel'), icon: FileSpreadsheet },
    { format: 'csv', label: 'CSV', icon: FileCode },
    { format: 'txt', label: 'TXT', icon: FileText },
    { format: 'json', label: 'JSON', icon: FileJson },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-xo-border bg-xo-panel/60 px-3 py-1.5 text-[11px] font-semibold text-xo-muted transition-colors hover:text-xo-text"
        >
          {t('exportScope')}: {scopeLabel(scope, t)}
          <ChevronDown size={12} />
        </button>
        {menuOpen && (
          <div className="absolute z-30 mt-1 flex min-w-44 flex-col rounded-xl border border-xo-border bg-xo-bg/95 p-1 shadow-lg backdrop-blur-xl">
            {(['full', 'users', 'purchases'] as ExportScope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setScope(s); setMenuOpen(false); }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-start text-[11px] transition-colors hover:bg-white/5',
                  scope === s ? 'text-xo-cyan' : 'text-xo-muted'
                )}
              >
                {scopeLabel(s, t)}
              </button>
            ))}
          </div>
        )}
      </div>
      {fmtButtons.map(({ format, label, icon: Icon }) => (
        <button
          key={format}
          type="button"
          onClick={() => onExport(format, scope)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-xo-border bg-xo-panel/60 px-3 py-1.5 text-[11px] font-semibold text-xo-muted transition-colors hover:border-xo-cyan/30 hover:text-xo-cyan"
        >
          <Icon size={12} /> {label}
        </button>
      ))}
    </div>
  );
}

function scopeLabel(scope: ExportScope, t: (k: 'exportFullReport' | 'usersOnly' | 'purchasesOnly' | 'transactionsOnly' | 'logsOnly') => string): string {
  switch (scope) {
    case 'users': return t('usersOnly');
    case 'purchases': return t('purchasesOnly');
    case 'transactions': return t('transactionsOnly');
    case 'logs': return t('logsOnly');
    default: return t('exportFullReport');
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function WatchlistFolderPage() {
  const { t } = useLanguage();
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { data: folder, loading, error } = useAdminWatchlistFolder(folderId ?? null);
  const { addUser, removeUser } = useWatchlistFolderActions(folderId ?? '');
  const { data: allUsers } = useUsers();
  const purchaseOrders = useDataStore((s) => s.purchaseOrders);
  const { overrides } = useWatchlistOverrides();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FolderFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('charged');
  const [showAddUsers, setShowAddUsers] = useState(false);
  const [drawerUser, setDrawerUser] = useState<AppUser | null>(null);
  const [resetTarget, setResetTarget] = useState<{ scope: 'single_user' | 'folder'; user?: AppUser } | null>(null);

  const folderUserIds = useMemo(() => new Set(folder?.userIds ?? []), [folder?.userIds]);
  const folderUsers = useMemo(() => allUsers.filter((u) => folderUserIds.has(u.id)), [allUsers, folderUserIds]);

  const ordersByUid = useMemo(() => {
    const map = new Map<string, PurchaseOrder[]>();
    for (const o of purchaseOrders) {
      if (!o.uid) continue;
      if (!map.has(o.uid)) map.set(o.uid, []);
      map.get(o.uid)!.push(o);
    }
    return map;
  }, [purchaseOrders]);

  const ordersFor = (u: AppUser) => ordersByUid.get(u.uid ?? u.id) ?? ordersByUid.get(u.id) ?? [];
  const overrideFor = (u: AppUser) => overrides.get(u.uid ?? u.id) ?? overrides.get(u.id) ?? null;

  // Per-user computed monitoring values
  const userRows = useMemo(() => {
    return folderUsers.map((u) => {
      const orders = ordersFor(u);
      const charge = computeUserCharge(orders, overrideFor(u));
      const suspicious = isSuspiciousUser({
        banned: u.banned, suspended: u.suspended, watchlisted: u.watchlisted,
        deleted: u.deleted, failedCount: charge.failedCount,
      });
      return { user: u, charge, suspicious };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderUsers, ordersByUid, overrides]);

  const stats = useMemo(() => {
    const now = Date.now();
    let onlineCount = 0, totalCoins = 0, displayedUsd = 0, historicalUsd = 0, todayCount = 0, failedCount = 0;
    for (const { user, charge } of userRows) {
      if (user.online) onlineCount++;
      totalCoins += user.Wallet?.coins ?? 0;
      displayedUsd += charge.displayedUsd;
      historicalUsd += charge.historicalUsd;
      failedCount += charge.failedCount;
      for (const o of ordersFor(user)) {
        if (isRealPurchaseOrder(o)) {
          const ms = toMs(purchaseOrderDisplayTime(o)) ?? 0;
          if (ms > 0 && now - ms <= ONE_DAY_MS) todayCount++;
        }
      }
    }
    return { onlineCount, totalCoins, displayedUsd, historicalUsd, todayCount, failedCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRows]);

  const displayRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    let rows = userRows.filter(({ user, charge, suspicious }) => {
      if (filter === 'online' && !user.online) return false;
      if (filter === 'offline' && user.online) return false;
      if (filter === 'hasPurchases' && charge.realCount === 0) return false;
      if (filter === 'noPurchases' && charge.realCount > 0) return false;
      if (filter === 'suspicious' && !suspicious) return false;
      if (!q) return true;
      return (
        (user.Profile?.displayName ?? user.Profile?.name ?? '').toLowerCase().includes(q) ||
        (user.Profile?.email ?? '').toLowerCase().includes(q) ||
        user.id.toLowerCase().includes(q) ||
        (user.uid ?? '').toLowerCase().includes(q) ||
        (user.inviteCode ?? user.referralCode ?? '').toLowerCase().includes(q)
      );
    });

    rows = [...rows].sort((a, b) => {
      switch (sortKey) {
        case 'newest': return (toMs(b.user.createdAt) ?? 0) - (toMs(a.user.createdAt) ?? 0);
        case 'oldest': return (toMs(a.user.createdAt) ?? 0) - (toMs(b.user.createdAt) ?? 0);
        case 'lastActive': return (toMs(getUserLastSeenValue(b.user)) ?? 0) - (toMs(getUserLastSeenValue(a.user)) ?? 0);
        case 'coins': return (b.user.Wallet?.coins ?? 0) - (a.user.Wallet?.coins ?? 0);
        case 'charged': return b.charge.displayedUsd - a.charge.displayedUsd;
        case 'purchases': return b.charge.realCount - a.charge.realCount;
        case 'games': return (b.user.Stats?.gamesPlayed ?? 0) - (a.user.Stats?.gamesPlayed ?? 0);
        case 'suspicious': return (b.suspicious ? 1 : 0) - (a.suspicious ? 1 : 0);
        case 'online':
        default: {
          const o = (b.user.online ? 1 : 0) - (a.user.online ? 1 : 0);
          if (o !== 0) return o;
          return (toMs(getUserLastSeenValue(b.user)) ?? 0) - (toMs(getUserLastSeenValue(a.user)) ?? 0);
        }
      }
    });
    return rows;
  }, [userRows, search, filter, sortKey]);

  const folderOrders = useMemo(
    () => purchaseOrders.filter((o) => o.uid && (folderUserIds.has(o.uid) || folderUsers.some((u) => u.uid === o.uid))),
    [purchaseOrders, folderUserIds, folderUsers]
  );

  function handleExport(format: ExportFormat, scope: ExportScope) {
    if (!folder) return;
    exportWatchlist(format, scope, { folderName: folder.name, users: folderUsers, orders: folderOrders });
    void logWatchlistExport({ scope, format, folderId: folder.id, folderName: folder.name, count: folderUsers.length });
  }

  async function handleRemoveUser(uid: string) {
    await removeUser(uid);
    void logWatchlistAdminAction('user_removed', { folderId: folder?.id, folderName: folder?.name, targetUid: uid });
    if (drawerUser?.id === uid) setDrawerUser(null);
  }

  async function confirmReset(reason: string) {
    if (!resetTarget || !folder) return;
    if (resetTarget.scope === 'single_user' && resetTarget.user) {
      const u = resetTarget.user;
      const charge = computeUserCharge(ordersFor(u), overrideFor(u));
      const targets: ChargeResetTarget[] = [{ uid: u.uid ?? u.id, previousTotalUsd: charge.displayedUsd, purchaseCount: charge.realCount }];
      await applyWatchlistChargeReset('single_user', targets, { folderId: folder.id, folderName: folder.name, reason });
    } else {
      const targets: ChargeResetTarget[] = folderUsers.map((u) => {
        const charge = computeUserCharge(ordersFor(u), overrideFor(u));
        return { uid: u.uid ?? u.id, previousTotalUsd: charge.displayedUsd, purchaseCount: charge.realCount };
      });
      await applyWatchlistChargeReset('folder', targets, { folderId: folder.id, folderName: folder.name, reason });
    }
    setResetTarget(null);
  }

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }
  if (error) {
    return <ErrorState title={t('errorTitle')} message={error.message} hint="firebase deploy --only firestore:rules" />;
  }
  if (!folder) {
    return <ErrorState title={t('errorTitle')} message={t('noData')} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/watchlist')}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-xo-border text-xo-muted transition-colors hover:text-xo-text"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: folder.color + '22' }}>
            <Folder size={18} style={{ color: folder.color }} />
          </div>
          <div>
            <h2 className="font-orbitron text-lg font-bold text-xo-text">{folder.name}</h2>
            {folder.description && <p className="text-xs text-xo-muted">{folder.description}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportPanel onExport={handleExport} />
          <button
            type="button"
            onClick={() => setResetTarget({ scope: 'folder' })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <RotateCcw size={12} /> {t('resetFolderTotals')}
          </button>
          <button
            type="button"
            onClick={() => setShowAddUsers(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-xo-cyan/30 bg-xo-cyan/10 px-3 py-1.5 text-xs font-bold text-xo-cyan transition-all hover:bg-xo-cyan/20"
          >
            <UserPlus size={13} /> {t('addUsers')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} variant="users" label={t('folderUsers')} value={folderUsers.length} />
        <StatCard icon={Wifi} variant="online" label={t('onlineNow')} value={stats.onlineCount} />
        <StatCard icon={Coins} variant="coins" label={t('totalCoins')} value={stats.totalCoins} />
        <StatCard icon={DollarSign} variant="revenue" label={t('displayedRevenue')} value={stats.displayedUsd} format={formatCurrency} hint={`${t('historicalRevenue')}: ${formatCurrency(stats.historicalUsd)}`} />
        <StatCard icon={ShoppingBag} variant="purchase" label={t('todayPurchases')} value={stats.todayCount} />
        <StatCard icon={AlertTriangle} variant="failed" label={t('failedAfterPayment')} value={stats.failedCount} />
      </div>

      {/* Controls */}
      <GlassCard>
        <div className="flex flex-col gap-3 border-b border-xo-border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-xo-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchUsers')}
                className="w-full rounded-xl border border-xo-border bg-xo-bg-soft/60 py-2 ps-8 pe-3 text-xs text-xo-text outline-none focus:border-xo-border-active"
              />
            </div>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="min-h-9 rounded-xl border border-xo-border bg-xo-bg-soft/60 px-3 text-xs text-xo-text outline-none focus:border-xo-border-active"
            >
              <option value="online">{t('sortOnlineFirst')}</option>
              <option value="charged">{t('totalCharged')}</option>
              <option value="coins">{t('sortHighestCoins')}</option>
              <option value="purchases">{t('purchases')}</option>
              <option value="games">{t('sortMostGames')}</option>
              <option value="newest">{t('sortNewestAccounts')}</option>
              <option value="oldest">{t('sortOldestAccounts')}</option>
              <option value="lastActive">{t('sortLastActive')}</option>
              <option value="suspicious">{t('suspicious')}</option>
            </select>
          </div>
          <ChipGroup>
            {([
              ['all', t('filterAll')], ['online', t('filterOnline')], ['offline', t('filterOffline')],
              ['hasPurchases', t('filterHasPurchases')], ['noPurchases', t('noPurchases')], ['suspicious', t('suspicious')],
            ] as [FolderFilter, string][]).map(([key, label]) => (
              <FilterChip key={key} active={filter === key} onClick={() => setFilter(key)}>{label}</FilterChip>
            ))}
          </ChipGroup>
        </div>

        {folderUsers.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2">
            <Users size={32} className="text-xo-muted" />
            <p className="text-sm text-xo-muted">{t('noUsersInFolder')}</p>
            <button type="button" onClick={() => setShowAddUsers(true)} className="mt-1 inline-flex items-center gap-1 rounded-xl bg-xo-cyan/10 px-3 py-1.5 text-xs font-bold text-xo-cyan hover:bg-xo-cyan/20">
              <UserPlus size={11} /> {t('addUsers')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-xo-border/40">
            {displayRows.map(({ user, charge, suspicious }) => {
              const name = user.Profile?.name ?? user.Profile?.displayName ?? t('noData');
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setDrawerUser(user)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-white/[0.03]"
                >
                  <UserAvatar photoURL={user.Profile?.photoURL} equippedAvatar={user.Cosmetics?.equippedAvatar} displayName={name} size="md" online={user.online} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-xo-text">{name}</p>
                      {suspicious && <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-rose-400">{t('suspicious')}</span>}
                      {charge.resetAtMs && <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-400">{t('resetCheckpoint')}</span>}
                    </div>
                    <p className="truncate text-[10px] text-xo-muted">{user.Profile?.email ?? user.id}</p>
                  </div>
                  <div className="hidden shrink-0 text-end sm:block">
                    <p className="font-orbitron text-xs font-bold text-coin">{(user.Wallet?.coins ?? 0).toLocaleString()}</p>
                    <p className="text-[9px] text-xo-muted">{t('coins')}</p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="font-orbitron text-xs font-bold text-emerald-400">{formatCurrency(charge.displayedUsd)}</p>
                    <p className="text-[9px] text-xo-muted">{charge.realCount} {t('purchases')}</p>
                  </div>
                  <div className="hidden shrink-0 text-end md:block">
                    <p className="text-[10px] text-xo-muted">{user.online ? t('online') : formatRelativeTime(getUserLastSeenValue(user))}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <CopyButton value={user.uid ?? user.id} label="UID" />
                    <button type="button" onClick={() => navigate(`/users?uid=${encodeURIComponent(user.id)}`)} title={t('openProfile')} className="flex h-5 w-5 items-center justify-center rounded-md border border-xo-border text-xo-muted transition-all hover:border-xo-cyan/40 hover:text-xo-cyan">
                      <ExternalLink size={10} />
                    </button>
                    <button type="button" onClick={() => setResetTarget({ scope: 'single_user', user })} title={t('resetThisUser')} className="flex h-5 w-5 items-center justify-center rounded-md border border-xo-border text-xo-muted transition-all hover:border-rose-500/40 hover:text-rose-400">
                      <RotateCcw size={10} />
                    </button>
                    <button type="button" onClick={() => { void handleRemoveUser(user.id); }} title={t('removeFromFolderAction')} className="flex h-5 w-5 items-center justify-center rounded-md border border-xo-border text-xo-muted transition-all hover:border-rose-500/40 hover:text-rose-400">
                      <UserMinus size={10} />
                    </button>
                  </div>
                </button>
              );
            })}
            {displayRows.length === 0 && <p className="py-8 text-center text-[11px] text-xo-muted">{t('noResults')}</p>}
          </div>
        )}
      </GlassCard>

      {showAddUsers && (
        <AddUsersModal
          folderUserIds={folderUserIds}
          onAdd={async (uid) => {
            await addUser(uid);
            void logWatchlistAdminAction('user_added', { folderId: folder.id, folderName: folder.name, targetUid: uid });
          }}
          onClose={() => setShowAddUsers(false)}
        />
      )}

      <WatchlistUserDetailsDrawer
        user={drawerUser}
        override={drawerUser ? overrideFor(drawerUser) : null}
        onClose={() => setDrawerUser(null)}
        onResetUser={(u) => setResetTarget({ scope: 'single_user', user: u })}
        onRemoveFromFolder={(uid) => { void handleRemoveUser(uid); }}
      />

      {resetTarget && (
        <AdminPasscodeConfirmModal
          title={resetTarget.scope === 'folder' ? t('resetFolderTotals') : t('resetThisUser')}
          message={t('resetChargeWarning')}
          confirmLabel={t('resetCharge')}
          requireKeyword="RESET"
          onConfirm={confirmReset}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}
