import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity,
  Archive,
  CheckCircle,
  ChevronDown,
  Clock,
  Coins,
  DollarSign,
  Gamepad2,
  Hash,
  Receipt,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Swords,
  Trash2,
  Users,
  Wifi,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { GlassCard } from '../shared/GlassCard';
import { StatCard } from '../shared/StatCard';
import { PurchaseStatusBadge } from '../shared/PurchaseStatusBadge';
import { RefreshButton } from '../shared/RefreshButton';
import { ErrorState } from '../shared/ErrorState';
import { useUsers } from '../../hooks/useUsers';
import { useTransactions } from '../../hooks/useTransactions';
import { useUserLogs } from '../../hooks/useUserLogs';
import { useArenaRooms } from '../../hooks/useArenaRooms';
import { useArchivedRooms } from '../../hooks/useArchivedRooms';
import { useDeletionRequests } from '../../hooks/useDeletionRequests';
import { useDeletionFeedback } from '../../hooks/useDeletionFeedback';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';
import { isUserOnline, getUserLastSeenValue, toMs } from '../../utils/userPresence';
import { auth, firebaseSetupError, readFirebaseProjectId } from '../../firebase/config';
import { useDataStore } from '../../stores/dataStore';
import { isPermissionDenied } from '../../utils/firestoreQueryHelpers';
import {
  isRealPurchaseOrder,
  purchaseOrderCoins,
  purchaseOrderNormalizedUsd,
  purchaseOrderDisplayTime,
  COINS_PER_USD,
} from '../../types/purchaseOrder';
import { ACTIVE_ROOM_STATUSES, type ArenaRoom } from '../../types/room';
import { resolveRoomGuestAvatar, resolveRoomHostAvatar, shortUid, usersById } from '../../utils/avatar';
import { UserAvatar } from '../shared/UserAvatar';
import { StatusBadge } from '../shared/StatusBadge';
import { CopyButton } from '../shared/CopyButton';
import { RoomDetailsDrawer } from '../arena/RoomDetailsDrawer';
import { formatRelativeTime } from '../../utils/relativeTime';
import { IconBadge, type IconBadgeVariant } from '../shared/IconBadge';
import type { AppUser } from '../../types/user';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const INACTIVE_EVENTS = new Set(['app_paused', 'logout']);

function SkeletonMetric() {
  return (
    <span className="inline-block h-9 min-w-[3rem] animate-pulse rounded-lg bg-white/10 align-middle" />
  );
}

interface MetricNumberProps {
  blockEnv: boolean;
  loading: boolean;
  error: Error | null;
  children: ReactNode;
}

function MetricNumber({ blockEnv, loading, error, children }: MetricNumberProps) {
  const { t } = useLanguage();
  if (blockEnv) return <>—</>;
  if (error) {
    const msg = (error as { code?: string })?.code ?? error.message ?? '';
    if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          {t('needsRtdbPermission')}
        </span>
      );
    }
    return <span className="text-sm text-red-400/70" title={error.message}>!</span>;
  }
  if (loading) return <SkeletonMetric />;
  return <>{children}</>;
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  onClick?: () => void;
  accent?: 'cyan' | 'sky' | 'emerald' | 'purple' | 'amber';
  pulse?: boolean;
}

const accentVariant: Record<NonNullable<MetricCardProps['accent']>, IconBadgeVariant> = {
  cyan: 'active',
  sky: 'rooms',
  emerald: 'online',
  purple: 'archive',
  amber: 'waiting',
};

function MetricCard({ icon: Icon, label, value, hint, onClick, accent = 'cyan', pulse }: MetricCardProps) {
  const Wrap = onClick ? 'button' : 'div';
  return (
    <Wrap
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`xo-card p-4 text-start ${onClick ? 'xo-card-interactive active:scale-[0.98]' : ''}`}
    >
      <IconBadge icon={Icon} variant={accentVariant[accent]} size="lg" hex pulse={pulse} active={pulse} />
      <p className="mt-3 font-orbitron text-2xl font-bold text-xo-text">{value}</p>
      <p className="mt-1 text-[11px] text-xo-muted">{label}</p>
      {hint && <p className="mt-0.5 truncate text-[10px] text-xo-muted/70">{hint}</p>}
    </Wrap>
  );
}

export function DashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: users, loading: usersLoading, error: usersError } = useUsers();
  const { data: transactions, loading: txLoading, error: txError } = useTransactions();
  const purchaseOrders = useDataStore((s) => s.purchaseOrders);
  const purchaseOrdersLoading = useDataStore((s) => s.purchaseOrdersLoading);
  const purchaseOrdersError = useDataStore((s) => s.purchaseOrdersError);
  const { data: logs, loading: logsLoading, error: logsError } = useUserLogs();
  const { data: rooms, loading: roomsLoading, error: roomsError } = useArenaRooms({ limitCount: 500 });
  const { data: archivedRooms, loading: archivedLoading } = useArchivedRooms({ initialLimit: 200 });
  const { data: deletionRequests, loading: deletionLoading } = useDeletionRequests();
  const { data: deletionFeedback } = useDeletionFeedback();

  const debugSnapshotSizes = useDataStore((s) => s.debugSnapshotSizes);
  const usersMap = useMemo(() => usersById(users), [users]);
  const [selectedRoom, setSelectedRoom] = useState<ArenaRoom | null>(null);
  const [metricNow] = useState(() => Date.now());
  const [moreOpen, setMoreOpen] = useState(true);
  const [previewUid, setPreviewUid] = useState<string | null>(null);

  const [authEmail, setAuthEmail] = useState<string | null>(() => auth.currentUser?.email ?? null);
  useEffect(() => auth.onAuthStateChanged((u) => setAuthEmail(u?.email ?? null)), []);

  const setupBlocked = firebaseSetupError !== null;
  const permIssue =
    isPermissionDenied(usersError) || isPermissionDenied(txError) || isPermissionDenied(logsError);

  const totalUsers = users.length;
  const onlineNow = useMemo(() => users.filter((u) => isUserOnline(u, metricNow)), [users, metricNow]);

  const coinsInSystem = useMemo(
    () => users.reduce((sum, u) => sum + Number(u.Wallet?.coins ?? 0), 0),
    [users]
  );

  const emailMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.id && u.Profile?.email) map.set(u.id, u.Profile.email);
    }
    return map;
  }, [users]);

  // Active-now from logs + presence (kept for the live activity strip below).
  const activeNow = useMemo(() => {
    const ACTIVE_TIMEOUT = 5 * 60 * 1000;
    const latestPerUser = new Map<string, { evt: string; time: number }>();
    for (const log of logs) {
      const evtLabel = log.eventName ?? log.eventType ?? '';
      if (log.uid && !latestPerUser.has(log.uid)) {
        latestPerUser.set(log.uid, { evt: evtLabel, time: toMs(log.timestamp ?? log.createdAt) });
      }
    }
    const activeUidSet = new Set<string>();
    for (const user of users) {
      if (!user.id) continue;
      if (isUserOnline(user, metricNow)) activeUidSet.add(user.id);
    }
    for (const [uid, { evt, time }] of latestPerUser) {
      if (metricNow - time < ACTIVE_TIMEOUT && !INACTIVE_EVENTS.has(evt)) activeUidSet.add(uid);
    }
    return activeUidSet.size;
  }, [logs, users, metricNow]);

  // Master Users preview — online first, then most-recently active.
  const usersPreview = useMemo(() => {
    return [...users]
      .sort((a, b) => {
        const oa = isUserOnline(a, metricNow) ? 1 : 0;
        const ob = isUserOnline(b, metricNow) ? 1 : 0;
        if (oa !== ob) return ob - oa;
        return toMs(getUserLastSeenValue(b)) - toMs(getUserLastSeenValue(a));
      })
      .slice(0, 6);
  }, [users, metricNow]);

  const previewUser: AppUser | null = useMemo(
    () => users.find((u) => u.id === previewUid) ?? usersPreview[0] ?? null,
    [users, previewUid, usersPreview]
  );

  const recentPurchaseOrders = useMemo(
    () => purchaseOrders.filter(isRealPurchaseOrder).slice(0, 6),
    [purchaseOrders]
  );

  // Room stats (real RTDB data)
  const roomStats = useMemo(() => {
    let live = 0;
    let active = 0;
    let waiting = 0;
    let finished = 0;
    let withBet = 0;
    for (const r of rooms) {
      live += 1;
      if (r.status && ACTIVE_ROOM_STATUSES.has(r.status)) active += 1;
      if (r.status === 'waiting') waiting += 1;
      if (r.status === 'finished') finished += 1;
      if (r.betEnabled) withBet += 1;
    }
    return { live, active, waiting, finished, withBet };
  }, [rooms]);

  const archivedCount = archivedRooms.length;

  const auditLogs24h = useMemo(() => {
    const cutoff = metricNow - ONE_DAY_MS;
    let n = 0;
    for (const log of logs) {
      if (!log.id?.startsWith('audit:')) continue;
      const ts = toMs(log.timestamp ?? log.createdAt);
      if (ts >= cutoff) n += 1;
    }
    return n;
  }, [logs, metricNow]);

  const deletionCount = useMemo(() => {
    const ids = new Set<string>();
    for (const d of deletionRequests) ids.add(d.uid || d.email || d.id);
    for (const d of deletionFeedback) ids.add(d.uid || d.email || d.id);
    return ids.size;
  }, [deletionRequests, deletionFeedback]);

  const recentRooms = useMemo<ArenaRoom[]>(() => rooms.slice(0, 4), [rooms]);
  const recentDeletions = useMemo(() => {
    const merged: Array<{
      id: string;
      uid?: string;
      email?: string;
      displayName?: string;
      reason?: string;
      time: number;
      source: 'request' | 'feedback';
    }> = [];
    for (const d of deletionRequests.slice(0, 10)) {
      merged.push({
        id: d.id,
        uid: d.uid,
        email: d.email,
        displayName: d.displayName,
        reason: d.reason ?? d.feedback,
        time: toMs(d.createdAt ?? d.requestedAt ?? d.updatedAt),
        source: 'request',
      });
    }
    for (const d of deletionFeedback.slice(0, 10)) {
      merged.push({
        id: d.id,
        uid: d.uid,
        email: d.email,
        reason: d.reason,
        time: toMs(d.deletionDate ?? d.createdAt),
        source: 'feedback',
      });
    }
    merged.sort((a, b) => b.time - a.time);
    return merged.slice(0, 5);
  }, [deletionRequests, deletionFeedback]);

  const totalCoins = useMemo(
    () => transactions.reduce((sum, tx) => sum + Number(tx.coinsAdded || 0), 0),
    [transactions]
  );

  const realRevenueSum = useMemo(() => {
    let sum = 0;
    let any = false;
    for (const tx of transactions) {
      const n = Number(tx.amount);
      if (Number.isFinite(n) && n > 0) {
        sum += n;
        any = true;
      }
    }
    return { sum, hasReal: any };
  }, [transactions]);

  const txPayingUids = useMemo(
    () => new Set(transactions.map((tx) => tx.uid).filter(Boolean) as string[]),
    [transactions]
  );

  const payingUsers = useMemo(() => {
    let n = 0;
    for (const u of users) {
      const spent = Number(u.Wallet?.totalSpent ?? 0);
      const pc = Number(u.purchasesCount ?? u.Wallet?.purchasesCount ?? 0);
      const uidMatch = Boolean(u.id && txPayingUids.has(u.id));
      if (spent > 0 || pc > 0 || uidMatch) n++;
    }
    return n;
  }, [users, txPayingUids]);

  const activeUids = useMemo(() => new Set(users.map((u) => u.id)), [users]);

  const purchaseOrderMetrics = useMemo(() => {
    const cutoff = metricNow - ONE_DAY_MS;
    let successCount = 0;
    let avatarCount = 0;
    let failedCount = 0;
    let alreadyProcessedCount = 0;
    let totalCoinsGranted = 0;
    let normalizedRevenue = 0;
    let todayOrders = 0;
    let deletedUserPurchasesCount = 0;

    for (const o of purchaseOrders) {
      if (!isRealPurchaseOrder(o)) continue;
      if (o.uid && !activeUids.has(o.uid)) deletedUserPurchasesCount++;
      if (o.status === 'grant_success') {
        successCount++;
        totalCoinsGranted += purchaseOrderCoins(o);
      }
      if (o.status === 'avatar_unlock_success') {
        avatarCount++;
        successCount++;
      }
      if (o.status === 'verification_failed' || o.status === 'grant_failed') failedCount++;
      if (o.status === 'already_processed') alreadyProcessedCount++;
      normalizedRevenue += purchaseOrderNormalizedUsd(o);
      const ts = o.createdAt;
      const tsMs =
        typeof ts === 'number'
          ? ts
          : typeof ts === 'object' && ts !== null && 'toDate' in ts
            ? (ts as { toDate(): Date }).toDate().getTime()
            : 0;
      if (tsMs >= cutoff) todayOrders++;
    }

    return {
      successCount,
      avatarCount,
      failedCount,
      alreadyProcessedCount,
      totalCoinsGranted,
      normalizedRevenue,
      todayOrders,
      deletedUserPurchasesCount,
    };
  }, [purchaseOrders, activeUids, metricNow]);

  const headlineRevenue = realRevenueSum.hasReal ? realRevenueSum.sum : purchaseOrderMetrics.normalizedRevenue;

  const lastError =
    firebaseSetupError ??
    usersError?.message ??
    txError?.message ??
    logsError?.message ??
    roomsError?.message ??
    null;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.info(
      `[Admin Debug] projectId=${readFirebaseProjectId()} authEmail=${authEmail ?? '(none)'} ` +
        `usersLoaded=${debugSnapshotSizes.users} auditLogsLoaded=${debugSnapshotSizes.auditLogs} ` +
        `transactionsLoaded=${debugSnapshotSizes.transactions} userLogsLoaded=${debugSnapshotSizes.userLogs} ` +
        `roomsLoaded=${rooms.length} lastError=${lastError ?? '(none)'}`
    );
  }, [
    authEmail,
    debugSnapshotSizes.auditLogs,
    debugSnapshotSizes.transactions,
    debugSnapshotSizes.userLogs,
    debugSnapshotSizes.users,
    rooms.length,
    lastError,
  ]);

  const recentLogs = logs.slice(0, 12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="xo-card xo-rim flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-orbitron text-xl font-bold text-xo-text">{t('dashboard')}</h1>
          <p className="mt-1 text-xs text-xo-muted">{t('realtimeOverview')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
            <span className="animate-pulse-dot h-2 w-2 rounded-full bg-emerald-300" />
            {t('systemLive')}
          </span>
          <RefreshButton />
        </div>
      </div>

      {firebaseSetupError && (
        <ErrorState title={t('firebaseSetup')} message={firebaseSetupError} hint={t('firebaseSetupHint')} />
      )}

      {permIssue && (
        <ErrorState
          title={t('adminPermissionDenied')}
          message={t('adminPermissionDeniedMsg')}
          hint={t('adminPermissionDeniedHint')}
        />
      )}

      {/* Hero stat row — animated counters */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Users}
          variant="users"
          label={t('totalUsers')}
          value={usersError ? '—' : totalUsers}
          onClick={() => navigate('/users')}
        />
        <StatCard
          icon={Wifi}
          variant="online"
          label={t('onlineUsers')}
          value={usersError ? '—' : onlineNow.length}
          hint={onlineNow.length > 0 ? `${activeNow} ${t('activeInRadar')}` : undefined}
          onClick={() => navigate('/users')}
        />
        <StatCard
          icon={Receipt}
          variant="revenue"
          label={t('totalRevenue')}
          value={headlineRevenue}
          format={formatCurrency}
          hint={realRevenueSum.hasReal ? undefined : t('normalizedUsd')}
          onClick={() => navigate('/transactions')}
        />
        <StatCard
          icon={Coins}
          variant="coins"
          label={t('coinsInSystem')}
          value={coinsInSystem}
          onClick={() => navigate('/transactions')}
        />
        <StatCard
          icon={Zap}
          variant="rooms"
          label={t('activeRooms')}
          value={roomsError ? '—' : roomStats.active}
          hint={roomsError ? t('needsRtdbPermission') : undefined}
          onClick={() => navigate('/arena-rooms')}
        />
        <StatCard
          icon={ScrollText}
          variant="logs"
          label={t('auditLogs24h')}
          value={auditLogs24h}
          onClick={() => navigate('/radar')}
        />
      </div>

      {/* Master Users preview + User Details preview */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="flex flex-col overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-xo-cyan" />
              <h3 className="font-orbitron text-sm font-bold text-white">{t('masterUsers')}</h3>
              {onlineNow.length > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {onlineNow.length} {t('onlineNow')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('/users')}
              className="text-[10px] font-bold uppercase tracking-wider text-xo-cyan/70 transition-colors hover:text-xo-cyan"
            >
              {t('viewAll')} →
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {usersLoading ? (
              <p className="px-4 py-8 text-center text-xs text-gray-500">…</p>
            ) : usersPreview.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-gray-600">{t('noUsersYet')}</p>
            ) : (
              usersPreview.map((u) => {
                const online = isUserOnline(u, metricNow);
                const isSel = previewUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setPreviewUid(u.id)}
                    className={`flex w-full items-center gap-3 border-t border-glass-border/30 px-5 py-3 text-start transition-colors first:border-t-0 ${
                      isSel ? 'bg-xo-cyan/[0.06]' : 'hover:bg-glass-hover'
                    }`}
                  >
                    <UserAvatar
                      photoURL={u.Profile?.photoURL ?? null}
                      displayName={u.Profile?.displayName ?? u.Profile?.name ?? null}
                      equippedAvatar={u.Cosmetics?.equippedAvatar ?? null}
                      size="md"
                      online={online}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {u.Profile?.name ?? u.Profile?.displayName ?? u.Profile?.email ?? shortUid(u.id)}
                      </p>
                      <p className="truncate text-[11px] text-gray-500">
                        {u.Profile?.email ?? shortUid(u.id)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-coin">
                      <Coins size={11} />
                      {formatNumber(u.Wallet?.coins ?? 0)}
                    </span>
                    {online ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        {t('online')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-600">
                        {formatRelativeTime(getUserLastSeenValue(u))}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </GlassCard>

        {/* User Details preview */}
        <GlassCard className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-xo-cyan" />
              <h3 className="font-orbitron text-sm font-bold text-white">{t('userDetails')}</h3>
            </div>
          </div>
          {previewUser ? (
            <div className="flex flex-1 flex-col px-5 pb-5">
              <div className="flex flex-col items-center text-center">
                <UserAvatar
                  photoURL={previewUser.Profile?.photoURL ?? null}
                  displayName={previewUser.Profile?.displayName ?? previewUser.Profile?.name ?? null}
                  equippedAvatar={previewUser.Cosmetics?.equippedAvatar ?? null}
                  size="xl"
                  online={isUserOnline(previewUser, metricNow)}
                />
                <p className="mt-3 truncate text-sm font-bold text-white">
                  {previewUser.Profile?.name ?? previewUser.Profile?.displayName ?? shortUid(previewUser.id)}
                </p>
                <p className="truncate text-[11px] text-gray-500">{previewUser.Profile?.email ?? '—'}</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-gray-600">{shortUid(previewUser.id)}</span>
                  <CopyButton value={previewUser.id} label="UID" />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="xo-card p-3 text-center">
                  <p className="inline-flex items-center justify-center gap-1 font-orbitron text-base font-bold text-coin">
                    <Coins size={13} />
                    {formatNumber(previewUser.Wallet?.coins ?? 0)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-xo-muted">{t('coins')}</p>
                </div>
                <div className="xo-card p-3 text-center">
                  <p className="inline-flex items-center justify-center gap-1 font-orbitron text-base font-bold text-xo-cyan">
                    <Gamepad2 size={13} />
                    {formatNumber(previewUser.Stats?.gamesPlayed ?? 0)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-xo-muted">{t('gamesPlayed')}</p>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('status')}</span>
                  <span className={isUserOnline(previewUser, metricNow) ? 'text-emerald-400' : 'text-gray-400'}>
                    {isUserOnline(previewUser, metricNow) ? t('online') : t('offline')}
                  </span>
                </div>
                {previewUser.Profile?.provider && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('provider')}</span>
                    <span className="text-gray-300">{previewUser.Profile.provider}</span>
                  </div>
                )}
                {(previewUser.inviteCode || previewUser.referralCode) && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('inviteCode')}</span>
                    <span className="font-mono text-xo-violet">{previewUser.inviteCode || previewUser.referralCode}</span>
                  </div>
                )}
                {previewUser.createdAt != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('joined')}</span>
                    <span className="text-gray-300">{formatDate(previewUser.createdAt)}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate(`/users?uid=${encodeURIComponent(previewUser.id)}`)}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-xo-cyan/30 bg-xo-cyan/10 px-4 py-2 text-xs font-semibold text-xo-cyan transition-colors hover:bg-xo-cyan/20"
              >
                {t('viewProfile')} →
              </button>
            </div>
          ) : (
            <p className="flex flex-1 items-center justify-center px-5 pb-8 text-center text-xs text-gray-600">
              {t('selectUserHint')}
            </p>
          )}
        </GlassCard>
      </div>

      {/* Recent Purchase Orders */}
      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag size={14} className="text-emerald-300" />
            <h3 className="font-orbitron text-sm font-bold text-white">{t('recentPurchaseOrders')}</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/purchase-orders')}
            className="text-[10px] font-bold uppercase tracking-wider text-xo-cyan/70 transition-colors hover:text-xo-cyan"
          >
            {t('viewAll')} →
          </button>
        </div>
        <div className="overflow-x-auto">
          {purchaseOrdersError ? (
            <p className="px-5 py-6 text-xs text-red-400/90">{t('permissionDeniedPurchaseOrders')}</p>
          ) : recentPurchaseOrders.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-gray-600">{t('noData')}</p>
          ) : (
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-glass-border text-start text-gray-500">
                  <th className="px-5 py-2.5 text-start font-semibold">{t('orderId')}</th>
                  <th className="px-3 py-2.5 text-start font-semibold">{t('product')}</th>
                  <th className="px-3 py-2.5 text-center font-semibold">{t('coins')}</th>
                  <th className="px-3 py-2.5 text-center font-semibold">{t('normalizedUsd')}</th>
                  <th className="px-3 py-2.5 text-center font-semibold">{t('status')}</th>
                  <th className="px-5 py-2.5 text-end font-semibold">{t('dateTime')}</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchaseOrders.map((o) => (
                  <tr key={o.id} className="border-b border-glass-border/40 transition-colors hover:bg-glass-hover">
                    <td className="px-5 py-2.5 font-mono text-neon-cyan">
                      {o.orderId ? `${o.orderId.slice(0, 14)}${o.orderId.length > 14 ? '…' : ''}` : shortUid(o.id)}
                    </td>
                    <td className="px-3 py-2.5 text-gray-300">{o.productId ?? '—'}</td>
                    <td className="px-3 py-2.5 text-center font-semibold text-coin">
                      {purchaseOrderCoins(o) > 0 ? formatNumber(purchaseOrderCoins(o)) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-emerald-300">
                      {formatCurrency(purchaseOrderNormalizedUsd(o))}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <PurchaseStatusBadge status={o.status} />
                    </td>
                    <td className="px-5 py-2.5 text-end text-gray-500">
                      {formatRelativeTime(purchaseOrderDisplayTime(o))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* More metrics & activity (collapsible) */}
      <div>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl border border-xo-border bg-white/[0.02] px-4 py-3 text-start transition-colors hover:bg-white/[0.04]"
          aria-expanded={moreOpen}
        >
          <span className="font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-xo-muted">
            {t('moreMetrics')}
          </span>
          <ChevronDown size={16} className={`text-xo-muted transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
        </button>

        {moreOpen && (
          <div className="mt-4 space-y-6">
            {/* Users & Rooms — primary metrics */}
            <div>
              <h2 className="mb-2 font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-xo-muted">
                {t('usersAndRooms')}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <MetricCard icon={Users} label={t('totalUsers')} accent="cyan" onClick={() => navigate('/users')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={usersLoading && !usersError} error={usersError}>{formatNumber(totalUsers)}</MetricNumber>} />
                <MetricCard icon={Wifi} label={t('onlineUsers')} accent="emerald" pulse={onlineNow.length > 0} onClick={() => navigate('/users')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={usersLoading && !usersError} error={usersError}>{formatNumber(onlineNow.length)}</MetricNumber>}
                  hint={onlineNow.length > 0 ? `${activeNow} ${t('activeInRadar')}` : undefined} />
                <MetricCard icon={Swords} label={t('liveRooms')} accent="cyan" pulse={roomStats.live > 0} onClick={() => navigate('/arena-rooms')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={roomsLoading && !roomsError} error={roomsError as Error | null}>{formatNumber(roomStats.live)}</MetricNumber>} />
                <MetricCard icon={Archive} label={t('archivedRooms')} accent="purple" onClick={() => navigate('/arena-rooms')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={archivedLoading} error={null}>{formatNumber(archivedCount)}</MetricNumber>} />
                <MetricCard icon={Zap} label={t('activeRooms')} accent="emerald" pulse={roomStats.active > 0} onClick={() => navigate('/arena-rooms')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={roomsLoading && !roomsError} error={roomsError}>{formatNumber(roomStats.active)}</MetricNumber>} />
                <MetricCard icon={Clock} label={t('waitingRoomsLabel')} accent="amber" onClick={() => navigate('/arena-rooms')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={roomsLoading && !roomsError} error={roomsError}>{formatNumber(roomStats.waiting)}</MetricNumber>} />
                <MetricCard icon={CheckCircle} label={t('finishedRoomsLabel')} accent="cyan" onClick={() => navigate('/arena-rooms')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={roomsLoading && !roomsError} error={roomsError}>{formatNumber(roomStats.finished)}</MetricNumber>} />
                <MetricCard icon={Coins} label={t('roomsWithBets')} accent="sky" onClick={() => navigate('/arena-rooms?bet=with')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={roomsLoading && !roomsError} error={roomsError}>{formatNumber(roomStats.withBet)}</MetricNumber>} />
                <MetricCard icon={Trash2} label={t('deletionRequests')} accent="purple" onClick={() => navigate('/deleted')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={deletionLoading} error={null}>{formatNumber(deletionCount)}</MetricNumber>} />
                <MetricCard icon={ScrollText} label={t('auditLogs24h')} accent="cyan" onClick={() => navigate('/radar')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={logsLoading && !logsError} error={logsError}>{formatNumber(auditLogs24h)}</MetricNumber>} />
              </div>
            </div>

            {/* Economy secondary row */}
            <div className={`grid gap-3 ${realRevenueSum.hasReal ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              <MetricCard icon={DollarSign} label={t('payingUsers')} accent="emerald" onClick={() => navigate('/transactions')}
                value={<MetricNumber blockEnv={setupBlocked} loading={usersLoading || txLoading} error={usersError ?? txError}>{formatNumber(payingUsers)}</MetricNumber>} />
              <MetricCard icon={Coins} label={t('totalCoins')} accent="cyan" onClick={() => navigate('/transactions')}
                value={<MetricNumber blockEnv={setupBlocked} loading={txLoading} error={txError}>{formatNumber(totalCoins)}</MetricNumber>}
                hint={`${transactions.length} txns`} />
              {realRevenueSum.hasReal && (
                <MetricCard icon={Receipt} label={t('totalRevenue')} accent="cyan" onClick={() => navigate('/transactions')}
                  value={<MetricNumber blockEnv={setupBlocked} loading={txLoading} error={txError}>{formatCurrency(realRevenueSum.sum)}</MetricNumber>} />
              )}
            </div>

            {/* Purchase system metrics */}
            <div>
              <h2 className="mb-2 font-orbitron text-xs font-bold uppercase tracking-[0.2em] text-xo-muted">
                {t('purchaseSystem')}
              </h2>
              {purchaseOrdersError &&
              (purchaseOrdersError.message?.includes('permission-denied') ||
                (purchaseOrdersError as { code?: string }).code === 'permission-denied') ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  {t('permissionDeniedPurchaseOrders')}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <MetricCard icon={ShieldCheck} label={t('successfulGrants')} accent="emerald" onClick={() => navigate('/purchase-orders')}
                    value={<MetricNumber blockEnv={setupBlocked} loading={purchaseOrdersLoading} error={purchaseOrdersError}>{formatNumber(purchaseOrderMetrics.successCount)}</MetricNumber>} />
                  <MetricCard icon={Coins} label={t('coinsGranted')} accent="cyan" onClick={() => navigate('/purchase-orders')}
                    value={<MetricNumber blockEnv={setupBlocked} loading={purchaseOrdersLoading} error={purchaseOrdersError}>{formatNumber(purchaseOrderMetrics.totalCoinsGranted)}</MetricNumber>}
                    hint={`${COINS_PER_USD} ${t('coins')} = $1`} />
                  <MetricCard icon={DollarSign} label={t('normalizedRevenue')} accent="emerald" onClick={() => navigate('/purchase-orders')}
                    value={<MetricNumber blockEnv={setupBlocked} loading={purchaseOrdersLoading} error={purchaseOrdersError}>{formatCurrency(purchaseOrderMetrics.normalizedRevenue)}</MetricNumber>} />
                  <MetricCard icon={Activity} label={t('todayPurchases')} accent="cyan" pulse={purchaseOrderMetrics.todayOrders > 0} onClick={() => navigate('/purchase-orders')}
                    value={<MetricNumber blockEnv={setupBlocked} loading={purchaseOrdersLoading} error={purchaseOrdersError}>{formatNumber(purchaseOrderMetrics.todayOrders)}</MetricNumber>} />
                  <MetricCard icon={RefreshCw} label={t('duplicatesPrevented')} accent="amber" onClick={() => navigate('/purchase-orders')}
                    value={<MetricNumber blockEnv={setupBlocked} loading={purchaseOrdersLoading} error={purchaseOrdersError}>{formatNumber(purchaseOrderMetrics.alreadyProcessedCount)}</MetricNumber>} />
                  <MetricCard icon={Zap} label={t('failedAfterPayment')} accent="purple" onClick={() => navigate('/purchase-orders')}
                    value={<MetricNumber blockEnv={setupBlocked} loading={purchaseOrdersLoading} error={purchaseOrdersError}>{formatNumber(purchaseOrderMetrics.failedCount)}</MetricNumber>} />
                </div>
              )}
              {!purchaseOrdersError && !purchaseOrdersLoading && purchaseOrderMetrics.deletedUserPurchasesCount > 0 && (
                <p className="mt-2 text-[10px] text-amber-500/70">
                  {purchaseOrderMetrics.deletedUserPurchasesCount} · {t('deletedUserPurchases')}
                </p>
              )}
            </div>

            {/* Recent rooms + Live activity */}
            <div className="grid gap-4 lg:grid-cols-2">
              <GlassCard className="flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Swords size={14} className="text-xo-cyan" />
                    <h3 className="font-orbitron text-sm font-bold text-white">{t('recentRooms')}</h3>
                  </div>
                  <button type="button" onClick={() => navigate('/arena-rooms')}
                    className="text-[10px] font-bold uppercase tracking-wider text-xo-cyan/70 transition-colors hover:text-xo-cyan">
                    {t('viewAll')} →
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {roomsLoading ? (
                    <p className="px-4 py-8 text-center text-xs text-gray-500">{t('loadingRooms')}</p>
                  ) : recentRooms.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-gray-600">{t('noRoomsYet')}</p>
                  ) : (
                    recentRooms.map((room) => (
                      <RecentRoomRow key={room.matchId || room.roomCode} room={room} onSelect={() => setSelectedRoom(room)} />
                    ))
                  )}
                </div>
              </GlassCard>

              <GlassCard className="flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-xo-cyan" />
                    <h3 className="font-orbitron text-sm font-bold text-white">{t('liveActivity')}</h3>
                  </div>
                  <button type="button" onClick={() => navigate('/radar')}
                    className="text-[10px] font-bold uppercase tracking-wider text-xo-cyan/70 transition-colors hover:text-xo-cyan">
                    {t('viewAll')} →
                  </button>
                </div>
                <div className="max-h-80 flex-1 overflow-y-auto bg-black/40 font-mono">
                  {logsLoading && !logsError ? (
                    <p className="px-4 py-8 text-center text-xs text-gray-500">{t('loadingActivity')}</p>
                  ) : logsError ? (
                    <p className="px-4 py-8 text-center text-xs text-red-400/90">{logsError.message}</p>
                  ) : recentLogs.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-gray-600">{t('noRecentLogs')}</p>
                  ) : (
                    recentLogs.map((log) => {
                      const email = log.uid ? emailMap.get(log.uid) : undefined;
                      const evtKey = log.eventName ?? log.eventType ?? '';
                      const isAudit = log.id?.startsWith('audit:');
                      return (
                        <div key={log.id} className="flex items-start gap-3 border-b border-glass-border/30 px-4 py-2.5 transition-colors hover:bg-glass-hover">
                          <span className="shrink-0 text-[10px] text-gray-600">{formatDate(log.timestamp ?? log.createdAt)}</span>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${isAudit ? 'bg-neon-purple/20 text-neon-purple' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isAudit ? 'AUDIT' : 'USER'}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] font-bold text-neon-cyan/90">{evtKey || 'unknown'}</span>
                          <span className="truncate font-mono text-[11px] text-gray-400" title={log.uid || ''}>
                            {email || (log.uid ? shortUid(log.uid) : '—')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </GlassCard>
            </div>

            {/* Recent deletion requests */}
            <GlassCard className="overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <Trash2 size={14} className="text-neon-purple" />
                  <h3 className="font-orbitron text-sm font-bold text-white">{t('recentDeletionRequests')}</h3>
                </div>
                <button type="button" onClick={() => navigate('/deleted')}
                  className="text-[10px] font-bold uppercase tracking-wider text-xo-cyan/70 transition-colors hover:text-xo-cyan">
                  {t('viewAll')} →
                </button>
              </div>
              <div>
                {recentDeletions.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-gray-600">{t('noDeletionRequests')}</p>
                ) : (
                  recentDeletions.map((d) => {
                    const appUser = d.uid ? usersMap.get(d.uid) : undefined;
                    const name = d.displayName ?? appUser?.Profile?.displayName ?? appUser?.Profile?.name ?? d.email ?? d.uid ?? '—';
                    return (
                      <div key={`${d.source}:${d.id}`} className="flex items-center gap-3 border-t border-glass-border/30 px-5 py-3 first:border-t-0">
                        <UserAvatar displayName={name} photoURL={appUser?.Profile?.photoURL ?? null} equippedAvatar={appUser?.Cosmetics?.equippedAvatar ?? null} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{name}</p>
                          <p className="truncate text-[11px] text-gray-500">{d.email ?? (d.uid ? shortUid(d.uid) : '—')}</p>
                          {d.reason && <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-400">{d.reason}</p>}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${d.source === 'request' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>
                            {d.source === 'request' ? t('requestLabel') : t('feedbackLabel')}
                          </span>
                          <span className="text-[10px] text-gray-500">{d.time ? formatRelativeTime(d.time) : '—'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      <RoomDetailsDrawer open={selectedRoom != null} room={selectedRoom} usersById={usersMap} onClose={() => setSelectedRoom(null)} />

      {import.meta.env.DEV && (
        <footer className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 font-mono text-[10px] leading-relaxed text-gray-600">
          <div className="text-gray-500">[Admin Debug]</div>
          <div>projectId={readFirebaseProjectId()}</div>
          <div>authEmail={authEmail ?? '(none)'}</div>
          <div>
            usersLoaded={debugSnapshotSizes.users} roomsLoaded={rooms.length}{' '}
            auditLogsLoaded={debugSnapshotSizes.auditLogs} userLogsLoaded={debugSnapshotSizes.userLogs}{' '}
            transactionsLoaded={debugSnapshotSizes.transactions} purchaseOrdersLoaded={debugSnapshotSizes.purchaseOrders}
          </div>
          <div>lastError={lastError ?? '(none)'}</div>
        </footer>
      )}
    </div>
  );
}

interface RecentRoomRowProps {
  room: ArenaRoom;
  onSelect: () => void;
}

function RecentRoomRow({ room, onSelect }: RecentRoomRowProps) {
  const { t } = useLanguage();
  const host = resolveRoomHostAvatar(room);
  const guest = resolveRoomGuestAvatar(room);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 border-t border-glass-border/30 px-5 py-3 text-start transition-colors first:border-t-0 hover:bg-glass-hover"
    >
      <span className="inline-flex items-center gap-1 rounded-md bg-neon-cyan/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-neon-cyan">
        <Hash size={10} />
        {room.roomCode}
      </span>
      <CopyButton value={room.roomCode} label="room code" size="xs" />
      <StatusBadge status={room.status} size="xs" />
      <div className="ms-2 flex min-w-0 flex-1 items-center gap-2">
        <UserAvatar photoURL={host.photoURL ?? null} displayName={host.name ?? null} equippedAvatar={host.equippedAvatar ?? null} size="sm" />
        <span className="truncate text-xs text-gray-300">{host.name ?? '—'}</span>
        <span className="text-[10px] text-gray-600">vs</span>
        {room.hasGuest ? (
          <>
            <UserAvatar photoURL={guest.photoURL ?? null} displayName={guest.name ?? null} equippedAvatar={guest.equippedAvatar ?? null} size="sm" />
            <span className="truncate text-xs text-gray-300">{guest.name ?? '—'}</span>
          </>
        ) : (
          <span className="truncate text-[11px] italic text-gray-500">{t('waitingShort')}</span>
        )}
      </div>
      {room.betEnabled && (
        <span className="inline-flex items-center gap-1 rounded-full bg-xo-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold text-xo-cyan">
          <Coins size={10} />
          {formatNumber(room.betAmount ?? 0)}
        </span>
      )}
    </button>
  );
}
