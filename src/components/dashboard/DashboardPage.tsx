import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Users, DollarSign, Activity, Receipt, Coins, Wifi } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { GlassCard } from '../shared/GlassCard';
import { RefreshButton } from '../shared/RefreshButton';
import { useUsers } from '../../hooks/useUsers';
import { useTransactions } from '../../hooks/useTransactions';
import { useUserLogs } from '../../hooks/useUserLogs';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { isUserOnline, toMs } from '../../utils/userPresence';
import { iapTransactionDisplayTime } from '../../types/transaction';
import { auth, firebaseSetupError, readFirebaseProjectId } from '../../firebase/config';
import { useDataStore } from '../../stores/dataStore';
import { isPermissionDenied } from '../../utils/firestoreQueryHelpers';

const COINS_PER_DOLLAR = 200;

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
  if (blockEnv) return <>—</>;
  if (error) return <>—</>;
  if (loading) return <SkeletonMetric />;
  return <>{children}</>;
}

export function DashboardPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: users, loading: usersLoading, error: usersError } = useUsers();
  const { data: transactions, loading: txLoading, error: txError } = useTransactions();
  const { data: logs, loading: logsLoading, error: logsError } = useUserLogs();

  const debugSnapshotSizes = useDataStore((s) => s.debugSnapshotSizes);

  const [authEmail, setAuthEmail] = useState<string | null>(() => auth.currentUser?.email ?? null);
  useEffect(() => auth.onAuthStateChanged((u) => setAuthEmail(u?.email ?? null)), []);

  const setupBlocked = firebaseSetupError !== null;
  const permIssue =
    isPermissionDenied(usersError) ||
    isPermissionDenied(txError) ||
    isPermissionDenied(logsError);

  const totalUsers = users.length;

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

  const totalCoins = useMemo(
    () => transactions.reduce((sum, tx) => sum + Number(tx.coinsAdded || 0), 0),
    [transactions]
  );

  const totalRevenue = useMemo(
    () =>
      transactions.reduce((sum, tx) => {
        const raw = tx.amount ?? tx.price;
        const n = Number(raw ?? 0);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [transactions]
  );

  const emailMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.id && u.Profile?.email) map.set(u.id, u.Profile.email);
    }
    return map;
  }, [users]);

  const { activeCount, activeEmails, onlineUsers } = useMemo(() => {
    const ACTIVE_TIMEOUT = 5 * 60 * 1000;
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();

    const latestPerUser = new Map<string, { evt: string; time: number }>();
    for (const log of logs) {
      const evtLabel = log.eventName ?? log.eventType ?? '';
      if (log.uid && !latestPerUser.has(log.uid)) {
        latestPerUser.set(log.uid, {
          evt: evtLabel,
          time: toMs(log.timestamp ?? log.createdAt),
        });
      }
    }

    const activeUidSet = new Set<string>();

    for (const user of users) {
      if (!user.id) continue;
      if (isUserOnline(user, now)) {
        activeUidSet.add(user.id);
      }
    }

    for (const [uid, { evt, time }] of latestPerUser) {
      const isRecent = now - time < ACTIVE_TIMEOUT;
      const isActive = isRecent && !INACTIVE_EVENTS.has(evt);
      if (isActive) {
        activeUidSet.add(uid);
      }
    }

    const emails = Array.from(activeUidSet)
      .map((uid) => emailMap.get(uid))
      .filter((email): email is string => Boolean(email));

    const online = users.filter((u) => u.id && activeUidSet.has(u.id));

    return { activeCount: activeUidSet.size, activeEmails: emails, onlineUsers: online };
  }, [logs, users, emailMap]);

  const recentLogs = logs;
  const recentTransactions = transactions.slice(0, 6);

  const lastError =
    firebaseSetupError ??
    usersError?.message ??
    txError?.message ??
    logsError?.message ??
    null;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.info(
      `[Admin Debug] projectId=${readFirebaseProjectId()} authEmail=${authEmail ?? '(none)'} usersLoaded=${debugSnapshotSizes.users} auditLogsLoaded=${debugSnapshotSizes.auditLogs} transactionsLoaded=${debugSnapshotSizes.transactions} userLogsLoaded=${debugSnapshotSizes.userLogs} mergedRadar=${debugSnapshotSizes.mergedRadarLogs} lastError=${lastError ?? '(none)'}`
    );
  }, [
    authEmail,
    debugSnapshotSizes.auditLogs,
    debugSnapshotSizes.mergedRadarLogs,
    debugSnapshotSizes.transactions,
    debugSnapshotSizes.userLogs,
    debugSnapshotSizes.users,
    lastError,
  ]);

  const eventColors: Record<string, string> = {
    login: 'text-green-400',
    logout: 'text-red-400',
    app_open: 'text-gray-400',
    app_paused: 'text-gray-500',
    app_resumed: 'text-gray-400',
    match_started: 'text-neon-cyan',
    match_ended: 'text-amber-400',
    purchase_completed: 'text-emerald-400',
    purchase_verified: 'text-emerald-300',
  };

  const platformBadge: Record<string, { bg: string; text: string }> = {
    android: { bg: 'bg-green-500/20', text: 'text-green-400' },
    ios: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    unknown: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
  };

  const payingLoading = usersLoading || txLoading;
  const activeLoading = usersLoading || logsLoading;
  const revenueLoading = txLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-orbitron text-xl font-bold text-white">{t('dashboard')}</h1>
        <p className="mt-1 text-xs text-gray-500">XO Kings Admin Overview</p>
      </div>

      {firebaseSetupError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
          <p className="font-bold text-amber-200">Firebase setup</p>
          <p className="mt-1 text-amber-100/90">{firebaseSetupError}</p>
        </div>
      )}

      {permIssue && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-100">
          <p className="font-bold text-red-200">Admin permission denied</p>
          <p className="mt-1">
            Sign in as <span className="font-mono">adminarena77@gmail.com</span>, set{' '}
            <span className="font-mono">VITE_ADMIN_EMAIL</span> to match Firestore rules, or adjust
            rules / custom claims. Failed reads are not shown as real zeros.
          </p>
        </div>
      )}

      {(usersError || txError || logsError) && !permIssue && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2 text-[11px] text-red-200/90">
          {usersError && <p>Users: {usersError.message}</p>}
          {txError && <p>Transactions: {txError.message}</p>}
          {logsError && <p>Live Radar: {logsError.message}</p>}
        </div>
      )}

      {/* Online users strip */}
      {!setupBlocked && (
        <div className="overflow-hidden rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            <Wifi size={13} className="shrink-0 text-green-400" />
            <span className="font-orbitron text-[11px] font-bold tracking-wide text-green-400">
              Online Now
            </span>
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 font-orbitron text-[10px] font-bold text-green-400">
              {onlineUsers.length}
            </span>
          </div>
          {onlineUsers.length === 0 ? (
            <p className="text-[11px] text-gray-600">
              {usersLoading ? 'Loading…' : 'No players online right now'}
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {onlineUsers.map((u) => {
                const name = u.Profile?.name ?? u.Profile?.displayName ?? u.Profile?.email ?? u.id;
                const initials = name.slice(0, 2).toUpperCase();
                return (
                  <div
                    key={u.id}
                    className="flex shrink-0 flex-col items-center gap-1"
                  >
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 font-orbitron text-[11px] font-bold text-green-400">
                        {initials}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black bg-green-400" />
                    </div>
                    <span className="max-w-[64px] truncate text-center text-[9px] text-gray-500">
                      {u.Profile?.email ?? name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Stat Cards — clickable */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="rounded-2xl border border-glass-border bg-glass-bg p-5 text-start backdrop-blur-xl transition-all duration-300 hover:border-neon-orange/30 hover:shadow-[0_0_20px_rgba(255,85,0,0.08)] active:scale-[0.98]"
        >
          <div className="rounded-xl bg-neon-orange/10 p-2.5 w-fit">
            <Users size={20} className="text-neon-orange" />
          </div>
          <p className="mt-4 font-orbitron text-2xl font-bold text-white">
            <MetricNumber
              blockEnv={setupBlocked}
              loading={usersLoading && !usersError}
              error={usersError}
            >
              {totalUsers}
            </MetricNumber>
          </p>
          <p className="mt-1 text-xs text-gray-500">{t('totalUsers')}</p>
          {usersError && (
            <p className="mt-1 text-[10px] text-red-400/90">Read failed — not an empty project.</p>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="rounded-2xl border border-glass-border bg-glass-bg p-5 text-start backdrop-blur-xl transition-all duration-300 hover:border-neon-orange/30 hover:shadow-[0_0_20px_rgba(255,85,0,0.08)] active:scale-[0.98]"
        >
          <div className="rounded-xl bg-neon-orange/10 p-2.5 w-fit">
            <DollarSign size={20} className="text-neon-orange" />
          </div>
          <p className="mt-4 font-orbitron text-2xl font-bold text-white">
            <MetricNumber
              blockEnv={setupBlocked}
              loading={payingLoading && !usersError && !txError}
              error={usersError ?? txError}
            >
              {payingUsers}
            </MetricNumber>
          </p>
          <p className="mt-1 text-xs text-gray-500">{t('payingUsers')}</p>
        </button>

        <button
          type="button"
          onClick={() => navigate('/radar?tab=activity')}
          className="rounded-2xl border border-glass-border bg-glass-bg p-5 text-start backdrop-blur-xl transition-all duration-300 hover:border-neon-orange/30 hover:shadow-[0_0_20px_rgba(255,85,0,0.08)] active:scale-[0.98]"
        >
          <div className="rounded-xl bg-neon-orange/10 p-2.5 w-fit">
            <Activity size={20} className="text-neon-orange" />
          </div>
          <p
            className={`mt-4 font-orbitron text-2xl font-bold ${
              activeCount > 0 ? 'text-green-400' : 'text-white'
            }`}
          >
            <MetricNumber
              blockEnv={setupBlocked}
              loading={activeLoading && !usersError && !logsError}
              error={usersError ?? logsError}
            >
              {activeCount}
            </MetricNumber>
          </p>
          <p className="mt-1 text-xs text-gray-500">{t('activeNow')}</p>
          {activeEmails.length > 0 && (
            <p className="mt-0.5 text-[10px] text-gray-600 truncate">
              {activeEmails.slice(0, 3).join(', ')}
              {activeEmails.length > 3 ? ` +${activeEmails.length - 3}` : ''}
            </p>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="rounded-2xl border border-glass-border bg-glass-bg p-5 text-start backdrop-blur-xl transition-all duration-300 hover:border-neon-orange/30 hover:shadow-[0_0_20px_rgba(255,85,0,0.08)] active:scale-[0.98]"
        >
          <div className="rounded-xl bg-neon-orange/10 p-2.5 w-fit">
            <Coins size={20} className="text-neon-orange" />
          </div>
          <p className="mt-4 font-orbitron text-2xl font-bold text-neon-orange">
            <MetricNumber
              blockEnv={setupBlocked}
              loading={revenueLoading && !txError}
              error={txError}
            >
              {formatCurrency(totalRevenue)}
            </MetricNumber>
          </p>
          <p className="mt-1 text-xs text-gray-500">{t('totalRevenue')}</p>
          <p className="mt-0.5 text-[10px] text-gray-600">
            {txLoading && !txError && !setupBlocked ? (
              <span className="inline-block h-3 w-32 animate-pulse rounded bg-white/5" />
            ) : txError ? (
              '—'
            ) : (
              <>
                {totalCoins.toLocaleString()} coins · {transactions.length} txns
              </>
            )}
          </p>
          {txError && (
            <p className="mt-1 text-[10px] text-red-400/90">Revenue unavailable — query failed.</p>
          )}
        </button>
      </div>

      {/* Two-column: Recent Logs + Recent Transactions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <h3 className="font-orbitron text-sm font-bold text-white">{t('liveRadar')}</h3>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton />
              <button
                type="button"
                onClick={() => navigate('/radar')}
                className="text-[10px] font-bold uppercase tracking-wider text-neon-orange/60 transition-colors hover:text-neon-orange"
              >
                View All →
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-black/40 font-mono max-h-80">
            {logsLoading && !logsError ? (
              <p className="px-4 py-8 text-center text-xs text-gray-500">Loading activity…</p>
            ) : logsError ? (
              <p className="px-4 py-8 text-center text-xs text-red-400/90">{logsError.message}</p>
            ) : recentLogs.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-gray-600">No recent logs</p>
            ) : (
              recentLogs.map((log) => {
                const email = log.uid ? emailMap.get(log.uid) : undefined;
                const evtKey = log.eventName ?? log.eventType ?? '';
                const color = eventColors[evtKey] || 'text-gray-400';
                const badge = platformBadge[log.platform || 'unknown'] || platformBadge.unknown;
                const detailStr = log.details
                  ? Object.entries(log.details)
                      .map(([k, v]) => `${k}=${v}`)
                      .join(' ')
                  : '';
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 border-b border-glass-border/30 px-4 py-2.5 transition-colors hover:bg-glass-hover"
                  >
                    <span className="shrink-0 text-xs text-gray-600">
                      {formatDate(log.timestamp ?? log.createdAt)}
                    </span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${badge.bg} ${badge.text}`}
                    >
                      {log.platform || '?'}
                    </span>
                    <span className={`shrink-0 font-mono text-xs font-bold ${color}`}>
                      {evtKey || 'unknown'}
                    </span>
                    <span
                      className="shrink-0 font-mono text-xs text-neon-cyan/80"
                      title={log.uid || ''}
                    >
                      {email || (log.uid ? `${log.uid.slice(0, 10)}...` : '---')}
                    </span>
                    {detailStr && (
                      <span className="truncate font-mono text-xs text-gray-600">{detailStr}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </GlassCard>

        <GlassCard className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Receipt size={14} className="text-neon-orange" />
              <h3 className="font-orbitron text-sm font-bold text-white">{t('transactions')}</h3>
            </div>
            <div className="flex items-center gap-2">
              <RefreshButton />
              <button
                type="button"
                onClick={() => navigate('/transactions')}
                className="text-[10px] font-bold uppercase tracking-wider text-neon-orange/60 transition-colors hover:text-neon-orange"
              >
                View All →
              </button>
            </div>
          </div>
          <div className="flex-1 divide-y divide-glass-border/20 overflow-y-auto px-1">
            {txLoading && !txError ? (
              <p className="px-4 py-8 text-center text-xs text-gray-500">Loading transactions…</p>
            ) : txError ? (
              <p className="px-4 py-8 text-center text-xs text-red-400/90">{txError.message}</p>
            ) : recentTransactions.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-gray-600">No transactions yet</p>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-glass-hover"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate text-xs text-white/80">
                      {tx.email || tx.uid || tx.orderId?.slice(0, 20) || '—'}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {formatDate(iapTransactionDisplayTime(tx))}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className="font-orbitron text-xs font-bold text-neon-orange">
                      +{(tx.coinsAdded || 0).toLocaleString()} coins
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {formatCurrency((tx.coinsAdded || 0) / COINS_PER_DOLLAR)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>

      {import.meta.env.DEV && (
        <footer className="rounded-lg border border-white/5 bg-black/30 px-3 py-2 font-mono text-[10px] leading-relaxed text-gray-600">
          <div className="text-gray-500">[Admin Debug]</div>
          <div>projectId={readFirebaseProjectId()}</div>
          <div>authEmail={authEmail ?? '(none)'}</div>
          <div>
            usersLoaded={debugSnapshotSizes.users} auditLogsLoaded={debugSnapshotSizes.auditLogs}{' '}
            userLogsLoaded={debugSnapshotSizes.userLogs} transactionsLoaded={debugSnapshotSizes.transactions}{' '}
            mergedRadarLogs={debugSnapshotSizes.mergedRadarLogs}
          </div>
          <div>lastError={lastError ?? '(none)'}</div>
        </footer>
      )}
    </div>
  );
}
