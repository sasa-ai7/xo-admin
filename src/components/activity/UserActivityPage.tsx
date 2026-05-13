import { useEffect, useState, useMemo } from 'react';
import { doc, updateDoc, serverTimestamp, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { useUsers } from '../../hooks/useUsers';
import { useUserLogs } from '../../hooks/useUserLogs';
import { useUserLogsForUser } from '../../hooks/useUserLogsForUser';
import { useUserTransactionsForUser } from '../../hooks/useUserTransactionsForUser';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { SearchInput } from '../shared/SearchInput';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { StatsCard } from '../shared/StatsCard';
import { ResponsiveTabs } from './ResponsiveTabs';
import { UsersDrawer } from './UsersDrawer';
import { UserInfoGrid } from './UserInfoGrid';
import { formatDateNumeric, formatDate, formatCurrency } from '../../utils/formatters';
import { ONLINE_FALLBACK_WINDOW_MS, getUserLastSeenValue, isUserOnline, toMs } from '../../utils/userPresence';
import { db } from '../../firebase/config';
import { COLLECTIONS } from '../../firebase/collections';
import { applyAdminCoinAdjustment } from '../../services/adminCoinAdjustment';
import { iapTransactionDisplayTime, type IAPTransaction } from '../../types/transaction';
import type { UserLog } from '../../types/userLog';
import {
  Search, User, Coins, Gamepad2, ArrowLeft, Menu,
  ShoppingCart, ChevronDown, ChevronUp,
  LogIn, LogOut, Play, Pause, Smartphone, Swords,
  Trophy, CreditCard, ShieldCheck, Clock, Calendar, Wifi, WifiOff, Star, Shield, ShieldOff, UserRoundCheck, UserRoundX,
  Terminal, LayoutGrid,
} from 'lucide-react';
import { CoinAdjustModal } from './CoinAdjustModal';
import { ConfirmDialog } from '../shared/ConfirmDialog';

const COINS_PER_DOLLAR = 200;

type TabFilter = 'overview' | 'games' | 'purchases' | 'logs' | 'coins';
type ViewMode = 'cards' | 'raw';

const GAME_EVENTS = ['match_started', 'match_ended', 'login', 'logout', 'app_open', 'app_paused', 'app_resumed'];
const PURCHASE_EVENTS = ['purchase_completed', 'purchase_verified'];
const INACTIVE_EVENTS = new Set(['app_paused', 'logout']);

function toWholeDays(value: unknown): number | null {
  const ts = toMs(value);
  if (!ts) return null;
  const diff = Date.now() - ts;
  if (diff < 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function pickNumberish(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

const eventConfig: Record<string, { label: string; color: string; icon: typeof LogIn }> = {
  login:               { label: 'Logged In',           color: 'text-green-400',   icon: LogIn },
  logout:              { label: 'Logged Out',          color: 'text-red-400',     icon: LogOut },
  app_open:            { label: 'Opened App',          color: 'text-gray-400',    icon: Smartphone },
  app_paused:          { label: 'App Backgrounded',    color: 'text-gray-500',    icon: Pause },
  app_resumed:         { label: 'App Resumed',         color: 'text-gray-400',    icon: Play },
  match_started:       { label: 'Match Started',       color: 'text-neon-cyan',   icon: Swords },
  match_ended:         { label: 'Match Ended',         color: 'text-neon-orange', icon: Trophy },
  purchase_completed:  { label: 'Purchase Completed',  color: 'text-emerald-400', icon: CreditCard },
  purchase_verified:   { label: 'Purchase Verified',   color: 'text-emerald-300', icon: ShieldCheck },
};

const platformBadge: Record<string, { bg: string; text: string }> = {
  android: { bg: 'bg-green-500/20', text: 'text-green-400' },
  ios: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  unknown: { bg: 'bg-gray-500/20', text: 'text-gray-500' },
};

function RawLogEntry({ log }: { log: UserLog }) {
  const color = eventConfig[log.eventType || '']?.color || 'text-gray-400';
  const badge = platformBadge[log.platform || 'unknown'] || platformBadge.unknown;

  const detailStr = log.details
    ? Object.entries(log.details)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
    : '';

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-2.5 border-b border-glass-border/30 px-3 py-2.5 transition-colors hover:bg-glass-hover sm:flex-nowrap sm:px-4">
      <span className="shrink-0 text-xs text-gray-600">
        {formatDateNumeric(log.timestamp ?? log.createdAt)}
      </span>
      <span
        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${badge.bg} ${badge.text}`}
      >
        {log.platform || '?'}
      </span>
      <span className={`shrink-0 font-mono text-xs font-bold ${color}`}>
        {log.eventType || 'unknown'}
      </span>
      {detailStr && (
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-600">
          {detailStr}
        </span>
      )}
    </div>
  );
}

function ResultPill({ result }: { result: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    win:  { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-400', label: 'WIN' },
    loss: { bg: 'bg-red-500/15 border-red-500/30',     text: 'text-red-400',   label: 'LOSS' },
    draw: { bg: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400', label: 'DRAW' },
  };
  const c = cfg[result] || { bg: 'bg-gray-500/15 border-gray-500/30', text: 'text-gray-400', label: result };
  return (
    <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function LogRow({ log }: { log: UserLog }) {
  const [expanded, setExpanded] = useState(false);
  const evt = log.eventType || 'unknown';
  const cfg = eventConfig[evt] || { label: evt, color: 'text-gray-400', icon: Clock };
  const Icon = cfg.icon;
  const d = log.details;

  const coinsEarned = pickNumberish(d?.coinsAdded, d?.coinsEarned, d?.rewardCoins, d?.reward);
  const hasDetails = Boolean(
    d && (d.matchType || d.gameMode || d.level != null || d.result || d.winner ||
    d.entryFee != null || coinsEarned != null || d.productId || d.orderId ||
    d.provider || d.balanceBefore != null || d.opponentId || d.opponentName ||
    d.xPlayer || d.oPlayer || d.gameId || d.matchId || d.side || d.playerSide)
  ) || Boolean(log.platform);

  return (
    <div className="group mx-2 mb-1.5 sm:mx-3">
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full rounded-2xl border px-3 py-3 text-start transition-all duration-200 sm:px-4 ${
          hasDetails ? 'cursor-pointer hover:bg-neon-orange/[0.04] hover:border-neon-orange/15' : 'cursor-default'
        } ${expanded ? 'border-neon-orange/20 bg-neon-orange/[0.05]' : 'border-neon-orange/5 bg-black/20'}`}
      >
        <div className="flex flex-wrap items-start gap-2.5 sm:flex-nowrap sm:items-center">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 ${cfg.color}`}>
            <Icon size={14} />
          </div>

          <div className="min-w-0 flex-1">
            <p className={`text-[13px] font-medium ${cfg.color}`}>{cfg.label}</p>
            <p className="mt-0.5 font-mono text-[10px] text-gray-600">
              {formatDateNumeric(log.timestamp ?? log.createdAt)}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
            {evt === 'match_ended' && Boolean(d?.result ?? d?.winner) && (
              <ResultPill result={String(d?.result ?? d?.winner)} />
            )}
            {evt === 'match_ended' && coinsEarned != null && coinsEarned !== 0 && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-0.5 text-[10px] font-bold text-amber-400">
                +{Number(coinsEarned).toLocaleString()} coins
              </span>
            )}
            {(evt === 'purchase_completed' || evt === 'purchase_verified') && coinsEarned != null && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-[10px] font-bold text-emerald-400">
                +{Number(coinsEarned).toLocaleString()}
              </span>
            )}
            {hasDetails ? (
              expanded ? (
                <ChevronUp size={14} className="ml-1 text-neon-orange/40" />
              ) : (
                <ChevronDown size={14} className="ml-1 text-gray-600 transition-colors group-hover:text-neon-orange/40" />
              )
            ) : null}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="-mt-1.5 rounded-b-2xl border border-t-0 border-neon-orange/10 bg-neon-orange/[0.02] px-4 py-3 sm:pl-14">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {Boolean(d?.matchType ?? d?.gameMode) && (
              <DetailItem label="Match Type" value={String(d?.matchType ?? d?.gameMode).replace(/_/g, ' ')} />
            )}
            {Boolean(d?.gameId ?? d?.matchId) && (
              <DetailItem label="Match ID" value={String(d?.gameId ?? d?.matchId)} mono />
            )}
            {d?.level != null && <DetailItem label="Level" value={`Level ${d.level}`} highlight />}
            {Boolean(d?.difficulty) && <DetailItem label="Difficulty" value={String(d?.difficulty)} />}
            {Boolean(d?.side ?? d?.playerSide ?? d?.xPlayer ?? d?.oPlayer) && (
              <DetailItem label="Played As" value={String(d?.side ?? d?.playerSide ?? (d?.xPlayer ? 'X' : 'O'))} />
            )}
            {Boolean(d?.result ?? d?.winner) && (
              <DetailItem
                label="Result"
                value={String(d?.result ?? d?.winner).toUpperCase()}
                valueClass={
                  String(d?.result ?? d?.winner) === 'win' ? 'text-green-400' :
                  String(d?.result ?? d?.winner) === 'loss' ? 'text-red-400' : 'text-yellow-400'
                }
              />
            )}
            {Boolean(d?.opponentId ?? d?.opponentName) && (
              <DetailItem label="Opponent" value={String(d?.opponentName ?? d?.opponentId)} mono={!d?.opponentName} />
            )}
            {d?.entryFee != null && <DetailItem label="Entry Fee" value={`${Number(d.entryFee).toLocaleString()} coins`} />}
            {d?.balanceBefore != null && (
              <DetailItem label="Balance Before" value={`${Number(d.balanceBefore).toLocaleString()} coins`} />
            )}
            {coinsEarned != null && (
              <DetailItem label="Coins Earned" value={`+${Number(coinsEarned).toLocaleString()} coins`} highlight />
            )}
            {d?.balanceAfter != null && (
              <DetailItem label="Balance After" value={`${Number(d.balanceAfter).toLocaleString()} coins`} highlight />
            )}
            {coinsEarned != null && evt !== 'match_ended' && (
              <DetailItem label="Dollar Value" value={formatCurrency(Number(coinsEarned) / COINS_PER_DOLLAR)} />
            )}
            {d?.productId && <DetailItem label="Product" value={String(d.productId)} />}
            {d?.orderId && <DetailItem label="Order ID" value={String(d.orderId)} mono />}
            {d?.provider && <DetailItem label="Provider" value={String(d.provider)} />}
            {log.platform && <DetailItem label="Platform" value={log.platform.toUpperCase()} />}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, highlight, mono, valueClass }: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-gray-600 sm:w-24">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono text-gray-500 break-all' : ''} ${highlight ? 'text-neon-orange font-semibold' : ''} ${valueClass || (!highlight && !mono ? 'text-gray-300' : '')}`}>
        {value}
      </span>
    </div>
  );
}

function RawTransactionEntry({ transaction }: { transaction: IAPTransaction }) {
  const detailStr = transaction
    ? [
        `orderId=${transaction.orderId || '?'}`,
        `email=${transaction.email || '?'}`,
        `coinsAdded=${transaction.coinsAdded || 0}`,
        `amount=${transaction.amount || 0}`,
        `status=${transaction.status || '?'}`,
      ].join(' ')
    : '';

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-2.5 border-b border-glass-border/30 px-3 py-2.5 transition-colors hover:bg-glass-hover sm:flex-nowrap sm:px-4">
      <span className="shrink-0 text-xs text-gray-600">
        {formatDateNumeric(iapTransactionDisplayTime(transaction))}
      </span>
      <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
        TXN
      </span>
      <span className="shrink-0 font-mono text-xs font-bold text-emerald-400">
        {transaction.orderId || 'unknown'}
      </span>
      {detailStr && (
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-gray-600">
          {detailStr}
        </span>
      )}
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: IAPTransaction }) {
  const [expanded, setExpanded] = useState(false);

  const hasDetails = Boolean(
    transaction.orderId ||
    transaction.productId ||
    transaction.purchaseToken ||
    transaction.balanceBefore != null ||
    transaction.balanceAfter != null ||
    transaction.status
  );

  return (
    <div className="group mx-2 mb-1.5 sm:mx-3">
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full rounded-2xl border px-3 py-3 text-start transition-all duration-200 sm:px-4 ${
          hasDetails ? 'cursor-pointer hover:bg-neon-orange/[0.04] hover:border-neon-orange/15' : 'cursor-default'
        } ${expanded ? 'border-neon-orange/20 bg-neon-orange/[0.05]' : 'border-neon-orange/5 bg-black/20'}`}
      >
        <div className="flex flex-wrap items-start gap-2.5 sm:flex-nowrap sm:items-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-emerald-400">
            <ShoppingCart size={14} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-emerald-400">Purchase</p>
            <p className="mt-0.5 font-mono text-[10px] text-gray-600">
              {formatDateNumeric(iapTransactionDisplayTime(transaction))}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
            {transaction.coinsAdded != null && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-[10px] font-bold text-emerald-400">
                +{Number(transaction.coinsAdded).toLocaleString()}
              </span>
            )}
            {transaction.amount != null && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-0.5 text-[10px] font-bold text-amber-400">
                ${Number(transaction.amount).toFixed(2)}
              </span>
            )}
            {hasDetails ? (
              expanded ? (
                <ChevronUp size={14} className="ml-1 text-neon-orange/40" />
              ) : (
                <ChevronDown size={14} className="ml-1 text-gray-600 transition-colors group-hover:text-neon-orange/40" />
              )
            ) : null}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="-mt-1.5 rounded-b-2xl border border-t-0 border-neon-orange/10 bg-neon-orange/[0.02] px-4 py-3 sm:pl-14">
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {transaction.orderId && <DetailItem label="Order ID" value={String(transaction.orderId)} mono />}
            {transaction.email && <DetailItem label="Email" value={transaction.email} />}
            {transaction.coinsAdded != null && (
              <DetailItem label="Coins Added" value={`+${Number(transaction.coinsAdded).toLocaleString()} coins`} highlight />
            )}
            {transaction.amount != null && (
              <DetailItem label="Amount (USD)" value={`$${Number(transaction.amount).toFixed(2)}`} highlight />
            )}
            {transaction.productId && <DetailItem label="Product" value={String(transaction.productId)} />}
            {transaction.purchaseToken && (
              <DetailItem label="Purchase Token" value={String(transaction.purchaseToken).slice(0, 20) + '...'} mono />
            )}
            {transaction.balanceBefore != null && transaction.balanceAfter != null && (
              <DetailItem label="Balance" value={`${Number(transaction.balanceBefore).toLocaleString()} → ${Number(transaction.balanceAfter).toLocaleString()} coins`} />
            )}
            {transaction.status && <DetailItem label="Status" value={String(transaction.status)} />}
          </div>
        </div>
      )}
    </div>
  );
}

export function UserActivityPage() {
  const { data: users, loading: usersLoading } = useUsers();
  const { data: allLogs } = useUserLogs();
  const { addToWatchlist, removeFromWatchlist, isWatched } = useWatchlistStore();
  const [search, setSearch] = useState('');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>('overview');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [usersDrawerOpen, setUsersDrawerOpen] = useState(false);
  const [coinModalOpen, setCoinModalOpen] = useState(false);
  const [coinModalUserId, setCoinModalUserId] = useState<string | null>(null);
  const [coinAmount, setCoinAmount] = useState('100');
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    actionKey: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUid),
    [users, selectedUid]
  );

  const targetAuthUid = selectedUser?.uid ?? selectedUser?.id ?? null;
  const {
    data: userLogs,
    loading: logsLoading,
    loadingMore,
    hasMore,
    loadMore,
    error: logsError,
    auditError: logsAuditError,
  } = useUserLogsForUser(targetAuthUid, {
    liveLimit: 200,
    pageSize: 100,
    docIdFallback: selectedUser?.id ?? null,
  });

  const coinModalUser = useMemo(
    () => users.find((u) => u.id === coinModalUserId) || null,
    [users, coinModalUserId]
  );

  // Fetch transactions for the selected user by email
  const {
    data: userTransactions,
    loading: transactionsLoading,
    loadingMore: transactionsLoadingMore,
    hasMore: transactionsHasMore,
    loadMore: loadMoreTransactions,
  } = useUserTransactionsForUser(
    { uid: selectedUid, email: selectedUser?.Profile?.email },
    { liveLimit: 100, pageSize: 100 }
  );

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return users
      .filter((u) => {
        if (!term) return true;
        const email = (u.Profile?.email || '').toLowerCase();
        const name = (u.Profile?.name || u.Profile?.displayName || '').toLowerCase();
        return (
          email.includes(term) ||
          name.includes(term) ||
          u.id.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const ka = (a.Profile?.email || a.Profile?.name || a.Profile?.displayName || a.id).toLowerCase();
        const kb = (b.Profile?.email || b.Profile?.name || b.Profile?.displayName || b.id).toLowerCase();
        return ka.localeCompare(kb);
      });
  }, [users, search]);

  useEffect(() => {
    if (filteredUsers.length === 0) {
      if (selectedUid !== null) {
        setSelectedUid(null);
      }
      return;
    }

    const exists = filteredUsers.some((u) => u.id === selectedUid);
    if (!selectedUid || !exists) {
      setSelectedUid(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUid]);

  const filteredLogs = useMemo(() => {
    const allowedEvents = activeTab === 'games' ? GAME_EVENTS : PURCHASE_EVENTS;
    return userLogs.filter((log) => allowedEvents.includes(log.eventType || ''));
  }, [userLogs, activeTab]);

  // Calculate stats from actual transaction data (not logs)
  const transactionStats = useMemo(() => {
    let totalCoinsSpent = 0;
    let purchases = 0;
    for (const tx of userTransactions) {
      purchases++;
      totalCoinsSpent += Number(tx.coinsAdded || 0);
    }
    return { totalCoinsSpent, purchases };
  }, [userTransactions]);

  const gameStats = useMemo(() => {
    let matches = 0;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let latestLifecycleEvent: UserLog | null = null;

    for (const log of userLogs) {
      if (
        !latestLifecycleEvent ||
        toMs(log.timestamp ?? log.createdAt) > toMs(latestLifecycleEvent.timestamp ?? latestLifecycleEvent.createdAt)
      ) {
        latestLifecycleEvent = log;
      }

      if (log.eventType !== 'match_ended') continue;

      matches += 1;

      const result = String(log.details?.result || '').toLowerCase();
      if (result === 'win') wins += 1;
      if (result === 'loss') losses += 1;
      if (result === 'draw') draws += 1;
    }

    return {
      matches,
      wins,
      losses,
      draws,
      latestLifecycleEvent,
    };
  }, [userLogs]);

  const activeUsersByLatestEvent = useMemo(() => {
    const now = Date.now();
    const latestByUid = new Map<string, { evt: string; time: number }>();

    // Global logs are newest-first from Firestore, so the first event per uid is the latest.
    for (const log of allLogs) {
      if (!log.uid || latestByUid.has(log.uid)) continue;
      latestByUid.set(log.uid, {
        evt: log.eventType || '',
        time: toMs(log.timestamp ?? log.createdAt),
      });
    }

    const activeUids = new Set<string>();
    for (const [uid, { evt, time }] of latestByUid) {
      const isRecent = time > 0 && now - time <= ONLINE_FALLBACK_WINDOW_MS;
      if (isRecent && !INACTIVE_EVENTS.has(evt)) {
        activeUids.add(uid);
      }
    }

    return activeUids;
  }, [allLogs]);

  const selectedLastSeen = getUserLastSeenValue(selectedUser);
  const derivedOnline = Boolean(
    selectedUser && (isUserOnline(selectedUser) || activeUsersByLatestEvent.has(selectedUser.id))
  );

  const openCoinModalForUser = (userId: string) => {
    setCoinModalUserId(userId);
    setCoinModalOpen(true);
  };

  const selectedWatchlisted = selectedUser ? (selectedUser.watchlisted === true || isWatched(selectedUser.id)) : false;

  const runUserUpdate = async (actionKey: string, payload: Record<string, unknown>) => {
    if (!selectedUser) return;
    setActionLoading(actionKey);
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), payload);
    } finally {
      setActionLoading(null);
    }
  };

  const parseCoinAmount = () => {
    const value = Number(coinAmount);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  };

  const applyCoinDelta = async (mode: 'add' | 'remove') => {
    if (!selectedUser) return;
    const amount = parseCoinAmount();
    if (!amount) return;
    const current = selectedUser.Wallet?.coins ?? 0;
    const delta = mode === 'add' ? amount : -amount;
    const next = current + delta;
    if (next < 0) return;
    setActionLoading(mode === 'add' ? 'coins-add' : 'coins-remove');
    try {
      await applyAdminCoinAdjustment({
        userId: selectedUser.id,
        delta,
        reason: actionReason || null,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const toggleWatchlist = async () => {
    if (!selectedUser) return;
    const next = !selectedWatchlisted;
    await runUserUpdate('watchlist-toggle', {
      watchlisted: next,
      watchlistReason: actionReason || null,
      watchlistUpdatedAt: serverTimestamp(),
    });
    if (next) addToWatchlist(selectedUser.id);
    else removeFromWatchlist(selectedUser.id);
  };

  const resetUserPurchasesAndCoins = async () => {
    if (!selectedUser) return;

    setActionLoading('reset-account');
    try {
      const transactionsQuery = query(
        collection(db, COLLECTIONS.transactions),
        where('uid', '==', selectedUser.id)
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);

      for (let i = 0; i < transactionsSnapshot.docs.length; i += 500) {
        const batch = writeBatch(db);
        const chunk = transactionsSnapshot.docs.slice(i, i + 500);

        chunk.forEach((transactionDoc) => batch.delete(transactionDoc.ref));
        await batch.commit();
      }

      await updateDoc(doc(db, 'users', selectedUser.id), {
        'Wallet.coins': 0,
        resetPurchasesAt: serverTimestamp(),
        resetPurchasesReason: actionReason || 'Admin reset account purchases',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const requestConfirmAction = (
    actionKey: string,
    title: string,
    message: string,
    onConfirm: () => Promise<void>
  ) => {
    setConfirmState({ open: true, title, message, actionKey, onConfirm });
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    await confirmState.onConfirm();
    setConfirmState(null);
  };

  const profileAge = useMemo(() => {
    if (!selectedUser) return null;
    const rawUser = selectedUser as unknown as Record<string, unknown>;
    return pickNumberish(
      selectedUser.Profile?.age,
      rawUser.age
    );
  }, [selectedUser]);

  const currentLevel = useMemo(() => {
    if (!selectedUser) return null;
    const rawUser = selectedUser as unknown as Record<string, unknown>;
    return pickNumberish(
      selectedUser.Stats?.currentLevel,
      rawUser.currentLevel,
      rawUser.level
    );
  }, [selectedUser]);

  const maxLevel = useMemo(() => {
    if (!selectedUser) return null;
    const rawUser = selectedUser as unknown as Record<string, unknown>;
    return pickNumberish(
      selectedUser.Stats?.maxLevel,
      rawUser.maxLevel
    );
  }, [selectedUser]);

  const accountAgeDays = useMemo(() => toWholeDays(selectedUser?.createdAt), [selectedUser?.createdAt]);

  const computedDraws = useMemo(() => {
    if (!selectedUser) return gameStats.draws;
    const rawUser = selectedUser as unknown as Record<string, unknown>;
    const explicitDraws = pickNumberish(
      selectedUser.Stats?.gamesDrawn,
      rawUser.gamesDrawn
    );
    if (explicitDraws !== null) return explicitDraws;

    const gamesPlayed = selectedUser.Stats?.gamesPlayed ?? gameStats.matches ?? 0;
    const wins = selectedUser.Stats?.gamesWon ?? gameStats.wins ?? 0;
    const losses = selectedUser.Stats?.gamesLost ?? gameStats.losses ?? 0;
    return Math.max(0, gamesPlayed - wins - losses);
  }, [selectedUser, gameStats.draws, gameStats.matches, gameStats.wins, gameStats.losses]);

  const tabOptions = [
    { value: 'overview' as const, label: 'Overview', icon: User },
    { value: 'games' as const, label: 'Games & Activity', icon: Gamepad2 },
    { value: 'purchases' as const, label: 'Purchases', icon: ShoppingCart },
    { value: 'logs' as const, label: 'Account Logs', icon: Terminal },
    { value: 'coins' as const, label: 'Coin Management', icon: Coins },
  ];

  const userInfoItems = selectedUser
    ? [
        {
          label: 'Auth UID',
          value: <span className="font-mono break-all text-[11px]">{selectedUser.uid ?? '—'}</span>,
        },
        {
          label: 'Doc ID',
          value: <span className="font-mono break-all text-[11px]">{selectedUser.id}</span>,
        },
        {
          label: 'Name',
          value: selectedUser.Profile?.name || selectedUser.Profile?.displayName || 'N/A',
        },
        {
          label: 'Coins',
          value: <span className="font-orbitron text-amber-400">{(selectedUser.Wallet?.coins ?? 0).toLocaleString()}</span>,
          tone: 'warning' as const,
          onClick: () => openCoinModalForUser(selectedUser.id),
        },
        {
          label: 'Games Played',
          value: String(selectedUser.Stats?.gamesPlayed ?? gameStats.matches ?? 0),
        },
        {
          label: 'Current / Max Level',
          value: `${currentLevel ?? 'N/A'} / ${maxLevel ?? 'N/A'}`,
        },
        {
          label: 'Age',
          value: String(profileAge ?? 'N/A'),
        },
      ]
    : [];

  const usersListPanel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-glass-border/60 bg-black/60 backdrop-blur-xl sm:rounded-[1.5rem]">
      <div className="px-3 pb-3 pt-3.5 sm:px-4 sm:pt-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neon-orange/10">
            <User size={14} className="text-neon-orange" />
          </div>
          <h3 className="font-orbitron text-sm font-bold tracking-wide text-white">Users</h3>
          <span className="rounded-full bg-neon-orange/10 px-2.5 py-0.5 font-orbitron text-[10px] font-bold text-neon-orange">
            {filteredUsers.length}
          </span>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by email..."
        />
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-2">
        {filteredUsers.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-gray-600">No users found</p>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = user.id === selectedUid;
            const isOnline = isUserOnline(user) || activeUsersByLatestEvent.has(user.id);

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setSelectedUid(user.id);
                  setActiveTab('overview');
                  setUsersDrawerOpen(false);
                }}
                className={`flex w-full max-w-full min-w-0 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-start transition-all duration-200 ${
                  isSelected
                    ? 'border-neon-orange/30 bg-neon-orange/10 shadow-[0_0_12px_rgba(255,85,0,0.08)]'
                    : 'border-transparent hover:border-neon-orange/10 hover:bg-neon-orange/[0.04]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[11px] font-medium ${isSelected ? 'text-neon-orange' : 'text-white/80'}`}>
                    {user.Profile?.email || `${user.id.slice(0, 12)}...`}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-gray-500">
                    {user.Profile?.name || user.Profile?.displayName || 'No name'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {user.Wallet?.coins != null && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400/70">
                        <Coins size={9} />
                        {user.Wallet.coins.toLocaleString()}
                      </span>
                    )}
                    {user.Stats?.gamesPlayed != null && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Gamepad2 size={9} />
                        {user.Stats.gamesPlayed}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {isOnline ? (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                      </span>
                      <span className="text-[10px] font-semibold text-green-400">Online</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gray-500" />
                      <span className="text-[10px] font-semibold text-gray-500">Offline</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  if (usersLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] min-w-0 flex-col gap-3 lg:flex-row lg:gap-4">
      <UsersDrawer
        open={usersDrawerOpen}
        onClose={() => setUsersDrawerOpen(false)}
        title="Users"
        subtitle={`${filteredUsers.length} available`}
      >
        <div className="flex min-h-full flex-col pb-2">{usersListPanel}</div>
      </UsersDrawer>

      <div className="hidden min-h-0 w-full max-w-[320px] shrink-0 lg:flex lg:flex-col">
        {usersListPanel}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {!selectedUid ? (
          <div className="flex min-h-[50svh] flex-1 items-center justify-center rounded-[1.25rem] border border-glass-border/60 bg-black/60 p-4 text-center backdrop-blur-xl sm:rounded-[1.5rem]">
            <div className="max-w-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-neon-orange/5">
                <Search size={24} className="text-neon-orange/30" />
              </div>
              <p className="text-sm font-medium text-gray-300">Select a user to view activity</p>
              <p className="mt-1 text-[11px] text-gray-600 lg:hidden">Open the users drawer to browse accounts.</p>
              <p className="mt-1 hidden text-[11px] text-gray-600 lg:block">Choose from the list on the left.</p>
              <button
                type="button"
                onClick={() => setUsersDrawerOpen(true)}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-neon-orange/30 bg-neon-orange/10 px-4 py-2 text-xs font-semibold text-neon-orange lg:hidden"
              >
                <Menu size={14} />
                Browse users
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-glass-border/60 bg-black/60 backdrop-blur-xl sm:rounded-[1.5rem]">
            <div className="border-b border-neon-orange/5 px-3 py-3 sm:px-4 md:px-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => setUsersDrawerOpen(true)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-black/40 text-gray-300 transition-all hover:border-neon-orange/30 hover:text-neon-orange lg:hidden"
                  >
                    <Menu size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUid(null)}
                    className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-orange/5 text-neon-orange/70 transition-all hover:bg-neon-orange/10 hover:text-neon-orange sm:flex"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neon-orange sm:text-base">
                      {selectedUser?.Profile?.email || selectedUid}
                    </p>
                    <p className="mt-1 break-all font-mono text-[10px] text-gray-600">{selectedUid}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUsersDrawerOpen(true)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-glass-border bg-black/30 px-3 py-2 text-[11px] text-gray-300 lg:hidden"
                  >
                    <User size={12} />
                    Users
                  </button>
                  {selectedUser?.Wallet?.coins != null && (
                    <button
                      type="button"
                      onClick={() => openCoinModalForUser(selectedUser.id)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-2 transition-colors hover:bg-amber-400/20"
                    >
                      <Coins size={13} className="text-amber-400" />
                      <span className="font-orbitron text-xs font-bold text-amber-400">
                        {selectedUser.Wallet.coins.toLocaleString()}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex max-w-full flex-wrap items-center gap-2">
                {derivedOnline ? (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[11px] font-medium text-green-400">
                    <Wifi size={11} />
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-500/15 bg-gray-500/5 px-3 py-1 text-[11px] font-medium text-gray-500">
                    <WifiOff size={11} />
                    <span className="truncate">{selectedLastSeen ? `Last seen ${formatDate(selectedLastSeen)}` : 'Offline'}</span>
                  </span>
                )}

                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-neon-orange/15 bg-neon-orange/5 px-3 py-1 text-[11px] font-medium text-neon-orange">
                  <Gamepad2 size={11} />
                  {gameStats.matches || selectedUser?.Stats?.gamesPlayed || 0} matches
                </span>
                <span className="rounded-full border border-green-500/15 bg-green-500/5 px-3 py-1 text-[11px] font-medium text-green-400">
                  {gameStats.wins || selectedUser?.Stats?.gamesWon || 0} wins
                </span>
                <span className="rounded-full border border-red-500/15 bg-red-500/5 px-3 py-1 text-[11px] font-medium text-red-400">
                  {gameStats.losses || selectedUser?.Stats?.gamesLost || 0} losses
                </span>
                <span className="rounded-full border border-yellow-500/15 bg-yellow-500/5 px-3 py-1 text-[11px] font-medium text-yellow-400">
                  {computedDraws} draws
                </span>

                {transactionStats.purchases > 0 && (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1 text-[11px] font-medium text-emerald-400">
                    <ShoppingCart size={11} />
                    <span className="truncate">
                      {transactionStats.purchases} purchases · {formatCurrency(transactionStats.totalCoinsSpent / COINS_PER_DOLLAR)}
                    </span>
                  </span>
                )}

                {selectedUser?.Profile?.provider && (
                  <span className="rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-[11px] font-medium text-blue-400">
                    {selectedUser.Profile.provider}
                  </span>
                )}
                {!!selectedUser?.createdAt && (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] text-gray-500">
                    <Calendar size={11} />
                    <span className="truncate">Joined {formatDate(selectedUser.createdAt)}</span>
                  </span>
                )}
                {accountAgeDays !== null && (
                  <span className="rounded-full border border-blue-500/15 bg-blue-500/5 px-3 py-1 text-[11px] font-medium text-blue-400">
                    Account age: {accountAgeDays} days
                  </span>
                )}
                {profileAge !== null && (
                  <span className="rounded-full border border-purple-500/15 bg-purple-500/5 px-3 py-1 text-[11px] font-medium text-purple-300">
                    Age: {profileAge}
                  </span>
                )}
                {currentLevel !== null && (
                  <span className="rounded-full border border-cyan-500/15 bg-cyan-500/5 px-3 py-1 text-[11px] font-medium text-cyan-300">
                    Level: {currentLevel}
                  </span>
                )}
                {maxLevel !== null && (
                  <span className="rounded-full border border-indigo-500/15 bg-indigo-500/5 px-3 py-1 text-[11px] font-medium text-indigo-300">
                    Max level: {maxLevel}
                  </span>
                )}
                {selectedUser?.deleted && (
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-400">
                    Deleted account
                  </span>
                )}
                {selectedUser?.banned && (
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-400">
                    Banned
                  </span>
                )}
                {selectedUser?.suspended && (
                  <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-medium text-orange-300">
                    Suspended
                  </span>
                )}
                {selectedUser?.isPremium && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-orange/20 bg-neon-orange/10 px-3 py-1 text-[11px] font-medium text-neon-orange">
                    <Star size={11} />
                    Premium
                  </span>
                )}
                {selectedUser?.verified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-300">
                    <UserRoundCheck size={11} />
                    Verified
                  </span>
                )}
                {selectedWatchlisted && (
                  <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-3 py-1 text-[11px] font-medium text-yellow-300">
                    Watchlisted
                  </span>
                )}
              </div>

              <div className="mt-4">
                <UserInfoGrid items={userInfoItems} />
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <ResponsiveTabs
                  tabs={tabOptions}
                  activeTab={activeTab}
                  onChange={setActiveTab}
                  className="flex-1"
                />

                {(activeTab === 'games' || activeTab === 'purchases' || activeTab === 'logs') && (
                  <div className="flex w-full justify-end lg:w-auto">
                    <div className="flex rounded-full border border-neon-orange/10 bg-black/30 p-1">
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                          viewMode === 'cards'
                            ? 'bg-neon-orange/15 text-neon-orange'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        <LayoutGrid size={12} />
                        Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('raw')}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                          viewMode === 'raw'
                            ? 'bg-neon-orange/15 text-neon-orange'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        <Terminal size={12} />
                        Raw
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 pt-2 sm:px-3 md:px-4">
              {activeTab === 'overview' ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <StatsCard
                    label="Account Status"
                    value={selectedUser?.deleted ? 'Deleted' : selectedUser?.banned ? 'Banned' : selectedUser?.suspended ? 'Suspended' : 'Active'}
                    valueClassName="font-orbitron text-neon-orange"
                  />
                  <StatsCard label="Provider" value={selectedUser?.Profile?.provider || 'N/A'} />
                  <StatsCard label="Last Active" value={selectedLastSeen ? formatDate(selectedLastSeen) : 'N/A'} />
                  <StatsCard
                    label="Total Matches"
                    value={String(selectedUser?.Stats?.gamesPlayed ?? gameStats.matches ?? 0)}
                    valueClassName="font-orbitron text-neon-orange"
                  />
                  <StatsCard
                    label="Revenue"
                    value={formatCurrency(transactionStats.totalCoinsSpent / COINS_PER_DOLLAR)}
                    valueClassName="font-orbitron text-amber-400"
                  />
                  <StatsCard
                    label="Purchases"
                    value={String(transactionStats.purchases)}
                    valueClassName="font-orbitron text-emerald-400"
                  />
                </div>
              ) : activeTab === 'games' ? (
                <>
                  {logsLoading ? (
                    <div className="flex h-32 items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-orange/5">
                        <Gamepad2 size={16} className="text-neon-orange/30" />
                      </div>
                      <p className="text-xs text-gray-600">No game activity found</p>
                    </div>
                  ) : viewMode === 'raw' ? (
                    <div className="overflow-hidden rounded-2xl border border-neon-orange/10 bg-black/40 font-mono">
                      {filteredLogs.map((log) => <RawLogEntry key={log.id} log={log} />)}
                    </div>
                  ) : (
                    filteredLogs.map((log) => <LogRow key={log.id} log={log} />)
                  )}

                  {(hasMore || loadingMore) && (
                    <div className="flex items-center justify-center border-t border-neon-orange/10 p-3">
                      {hasMore ? (
                        <button
                          type="button"
                          onClick={() => {
                            void loadMore();
                          }}
                          disabled={loadingMore}
                          className="rounded-full border border-neon-orange/30 bg-neon-orange/10 px-4 py-1.5 text-xs font-semibold text-neon-orange transition-colors hover:bg-neon-orange/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingMore ? 'Loading...' : 'Load older logs'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-600">No older logs</span>
                      )}
                    </div>
                  )}
                </>
              ) : activeTab === 'purchases' ? (
                <>
                  {transactionsLoading ? (
                    <div className="flex h-32 items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : userTransactions.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-orange/5">
                        <ShoppingCart size={16} className="text-neon-orange/30" />
                      </div>
                      <p className="text-xs text-gray-600">No purchases found</p>
                    </div>
                  ) : viewMode === 'raw' ? (
                    <div className="overflow-hidden rounded-2xl border border-neon-orange/10 bg-black/40 font-mono">
                      {userTransactions.map((tx) => <RawTransactionEntry key={tx.id} transaction={tx} />)}
                    </div>
                  ) : (
                    userTransactions.map((tx) => <TransactionRow key={tx.id} transaction={tx} />)
                  )}

                  {(transactionsHasMore || transactionsLoadingMore) && (
                    <div className="flex items-center justify-center border-t border-neon-orange/10 p-3">
                      {transactionsHasMore ? (
                        <button
                          type="button"
                          onClick={() => {
                            void loadMoreTransactions();
                          }}
                          disabled={transactionsLoadingMore}
                          className="rounded-full border border-neon-orange/30 bg-neon-orange/10 px-4 py-1.5 text-xs font-semibold text-neon-orange transition-colors hover:bg-neon-orange/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {transactionsLoadingMore ? 'Loading...' : 'Load older purchases'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-600">No older purchases</span>
                      )}
                    </div>
                  )}
                </>
              ) : activeTab === 'logs' ? (
                <>
                  {logsLoading ? (
                    <div className="flex h-32 items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : logsError ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2">
                      <p className="text-xs text-red-400">Failed to load logs: {logsError.message}</p>
                    </div>
                  ) : userLogs.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neon-orange/5">
                        <Terminal size={16} className="text-neon-orange/30" />
                      </div>
                      <p className="text-xs text-gray-600">No account logs found</p>
                      {logsAuditError && (
                        <p className="text-[10px] text-amber-500">Audit logs unavailable: {logsAuditError.message}</p>
                      )}
                    </div>
                  ) : viewMode === 'raw' ? (
                    <div className="overflow-hidden rounded-2xl border border-neon-orange/10 bg-black/40 font-mono">
                      {userLogs.map((log) => <RawLogEntry key={log.id} log={log} />)}
                    </div>
                  ) : (
                    userLogs.map((log) => <LogRow key={log.id} log={log} />)
                  )}
                </>
              ) : (
                <div className="space-y-3 pb-3">
                  <div className="rounded-2xl border border-neon-orange/20 bg-black/30 p-4">
                    <p className="text-[11px] font-semibold text-neon-orange">Coin Management</p>
                    <p className="mt-1 text-[10px] text-gray-500">Use quick amounts or custom value, then apply add/remove.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[50, 100, 500, 1000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setCoinAmount(String(v))}
                          className="rounded-full border border-neon-orange/20 bg-neon-orange/10 px-3 py-1 text-[10px] font-semibold text-neon-orange transition-colors hover:bg-neon-orange/20"
                        >
                          +{v}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        value={coinAmount}
                        onChange={(e) => setCoinAmount(e.target.value)}
                        type="number"
                        min={1}
                        className="w-full rounded-xl border border-glass-border bg-black/40 px-3 py-2 text-xs text-gray-200 outline-none focus:border-neon-orange/40 sm:w-36"
                        placeholder="Amount"
                      />
                      <input
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="w-full min-w-0 flex-1 rounded-xl border border-glass-border bg-black/40 px-3 py-2 text-xs text-gray-200 outline-none focus:border-neon-orange/40"
                        placeholder="Reason (optional)"
                      />
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          void applyCoinDelta('add');
                        }}
                        disabled={actionLoading === 'coins-add'}
                        className="w-full rounded-full bg-neon-orange px-4 py-2 text-xs font-bold text-black shadow-[0_0_15px_rgba(255,85,0,0.25)] disabled:opacity-60 sm:w-auto"
                      >
                        {actionLoading === 'coins-add' ? 'Adding...' : 'Add Coins'}
                      </button>
                      <button
                        type="button"
                        onClick={() => requestConfirmAction('coins-remove', 'Remove Coins', 'This action deducts coins from user wallet.', async () => {
                          await applyCoinDelta('remove');
                        })}
                        disabled={actionLoading === 'coins-remove'}
                        className="w-full rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 disabled:opacity-60 sm:w-auto"
                      >
                        Remove Coins
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-glass-border/50 bg-black/30 p-4">
                    <p className="text-[11px] font-semibold text-white">Admin Actions</p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => requestConfirmAction('ban-toggle', selectedUser?.banned ? 'Unban User' : 'Ban User', selectedUser?.banned ? 'User will be restored from banned state.' : 'User will be banned immediately.', async () => {
                          await runUserUpdate('ban-toggle', {
                            banned: !selectedUser?.banned,
                            banReason: actionReason || null,
                            bannedAt: !selectedUser?.banned ? serverTimestamp() : null,
                          });
                        })}
                        disabled={actionLoading === 'ban-toggle'}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 disabled:opacity-60 sm:w-auto"
                      >
                        {selectedUser?.banned ? <ShieldOff size={12} /> : <Shield size={12} />}
                        {selectedUser?.banned ? 'Unban User' : 'Ban User'}
                      </button>

                      <button
                        type="button"
                        onClick={() => requestConfirmAction('suspend-toggle', selectedUser?.suspended ? 'Restore User' : 'Suspend User', selectedUser?.suspended ? 'User access will be restored.' : 'User will be suspended until manually restored.', async () => {
                          await runUserUpdate('suspend-toggle', {
                            suspended: !selectedUser?.suspended,
                            suspendReason: actionReason || null,
                            suspendedAt: !selectedUser?.suspended ? serverTimestamp() : null,
                          });
                        })}
                        disabled={actionLoading === 'suspend-toggle'}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-300 disabled:opacity-60 sm:w-auto"
                      >
                        {selectedUser?.suspended ? <UserRoundCheck size={12} /> : <UserRoundX size={12} />}
                        {selectedUser?.suspended ? 'Restore User' : 'Suspend User'}
                      </button>

                      <button
                        type="button"
                        onClick={() => requestConfirmAction('premium-toggle', selectedUser?.isPremium ? 'Revoke Premium' : 'Mark Premium', selectedUser?.isPremium ? 'Premium status will be removed.' : 'User will be marked as premium.', async () => {
                          await runUserUpdate('premium-toggle', {
                            isPremium: !selectedUser?.isPremium,
                            premiumUpdatedAt: serverTimestamp(),
                          });
                        })}
                        disabled={actionLoading === 'premium-toggle'}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-neon-orange/30 bg-neon-orange/10 px-4 py-2 text-xs font-bold text-neon-orange disabled:opacity-60 sm:w-auto"
                      >
                        <Star size={12} />
                        {selectedUser?.isPremium ? 'Revoke Premium' : 'Mark Premium'}
                      </button>

                      <button
                        type="button"
                        onClick={() => requestConfirmAction(
                          'reset-account',
                          'Reset Account',
                          'Are you sure you want to reset this user\'s purchases? This will set their coins to 0 and delete their transaction history.',
                          async () => {
                            await resetUserPurchasesAndCoins();
                          }
                        )}
                        disabled={actionLoading === 'reset-account'}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.08)] transition-all hover:border-red-400/70 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-60 sm:w-auto"
                      >
                        <Coins size={12} />
                        {actionLoading === 'reset-account' ? 'Resetting...' : 'Reset Account'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void toggleWatchlist();
                        }}
                        disabled={actionLoading === 'watchlist-toggle'}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-bold text-yellow-300 disabled:opacity-60 sm:w-auto"
                      >
                        {selectedWatchlisted ? 'Remove Watchlist' : 'Add Watchlist'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CoinAdjustModal
        isOpen={coinModalOpen && Boolean(coinModalUser)}
        onClose={() => {
          setCoinModalOpen(false);
          setCoinModalUserId(null);
        }}
        userId={coinModalUser?.id || ''}
        currentCoins={coinModalUser?.Wallet?.coins ?? 0}
        onSuccess={() => {
          setCoinModalOpen(false);
          setCoinModalUserId(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmState?.open)}
        title={confirmState?.title || 'Confirm action'}
        message={confirmState?.message || ''}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          void handleConfirm();
        }}
        confirmLabel={confirmState?.actionKey === 'premium-toggle'
          ? 'Apply'
          : confirmState?.actionKey === 'reset-account'
            ? 'Confirm Reset'
            : 'Confirm'}
      />
    </div>
  );
}
