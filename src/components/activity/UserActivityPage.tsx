import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { doc, updateDoc, serverTimestamp, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { useUsers } from '../../hooks/useUsers';
import { useUserLogs } from '../../hooks/useUserLogs';
import { useUserLogsForUser } from '../../hooks/useUserLogsForUser';
import { useUserTransactionsForUser } from '../../hooks/useUserTransactionsForUser';
import { usePurchaseOrdersForUser } from '../../hooks/usePurchaseOrdersForUser';
import { useWalletLedgerForUser } from '../../hooks/useWalletLedgerForUser';
import { useOwnedAvatarsForUser } from '../../hooks/useOwnedAvatarsForUser';
import { useRoomHistoryForUser } from '../../hooks/useRoomHistoryForUser';
import { useArenaRooms } from '../../hooks/useArenaRooms';
import { useArchivedRooms } from '../../hooks/useArchivedRooms';
import { useDeletionRequests } from '../../hooks/useDeletionRequests';
import { StatusBadge } from '../shared/StatusBadge';
import { CopyButton } from '../shared/CopyButton';
import { formatRelativeTime } from '../../utils/relativeTime';
import { useLanguage } from '../../i18n/LanguageContext';
import { shortUid } from '../../utils/avatar';
import type { ArenaRoom } from '../../types/room';
import { UserAvatar } from '../shared/UserAvatar';
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
import {
  purchaseOrderDisplayTime,
  purchaseOrderCoins,
  purchaseOrderNormalizedUsd,
  isRealPurchaseOrder,
  isNoisePurchaseOrder,
  shouldCountForRevenue,
} from '../../types/purchaseOrder';
import type { UserLog } from '../../types/userLog';
import {
  Search, User, Coins, Gamepad2, ArrowLeft, Menu,
  ShoppingCart, ChevronDown, ChevronUp,
  LogIn, LogOut, Play, Pause, Smartphone, Swords,
  Trophy, CreditCard, ShieldCheck, Clock, Calendar, Wifi, WifiOff, Star, Shield, ShieldOff, UserRoundCheck, UserRoundX,
  Terminal, LayoutGrid, Share2, ArrowDownUp,
} from 'lucide-react';
import { CoinAdjustModal } from './CoinAdjustModal';
import { ConfirmDialog } from '../shared/ConfirmDialog';

const COINS_PER_DOLLAR = 200;

type TabFilter = 'overview' | 'games' | 'purchases' | 'logs' | 'coins' | 'rooms';
type ViewMode = 'cards' | 'raw';
type UserSortKey = 'online' | 'newest' | 'oldest' | 'lastActive' | 'coins' | 'games';
type UserFilterKey = 'all' | 'online' | 'offline' | 'purchases' | 'highBalance' | 'newToday' | 'suspicious';

const HIGH_BALANCE_THRESHOLD = 10000;

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
  app_open:            { label: 'Opened App',          color: 'text-xo-muted',    icon: Smartphone },
  app_paused:          { label: 'App Backgrounded',    color: 'text-xo-muted',    icon: Pause },
  app_resumed:         { label: 'App Resumed',         color: 'text-xo-muted',    icon: Play },
  match_started:       { label: 'Match Started',       color: 'text-neon-cyan',   icon: Swords },
  match_ended:         { label: 'Match Ended',         color: 'text-xo-cyan', icon: Trophy },
  purchase_completed:  { label: 'Purchase Completed',  color: 'text-emerald-400', icon: CreditCard },
  purchase_verified:   { label: 'Purchase Verified',   color: 'text-emerald-300', icon: ShieldCheck },
};

const platformBadge: Record<string, { bg: string; text: string }> = {
  android: { bg: 'bg-green-500/20', text: 'text-green-400' },
  ios: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  unknown: { bg: 'bg-gray-500/20', text: 'text-xo-muted' },
};

function RawLogEntry({ log }: { log: UserLog }) {
  const color = eventConfig[log.eventType || '']?.color || 'text-xo-muted';
  const badge = platformBadge[log.platform || 'unknown'] || platformBadge.unknown;

  const detailStr = log.details
    ? Object.entries(log.details)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
    : '';

  return (
    <div className="flex min-w-0 flex-wrap items-start gap-2.5 border-b border-glass-border/30 px-3 py-2.5 transition-colors hover:bg-glass-hover sm:flex-nowrap sm:px-4">
      <span className="shrink-0 text-xs text-xo-muted/70">
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
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-xo-muted/70">
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
  const c = cfg[result] || { bg: 'bg-gray-500/15 border-gray-500/30', text: 'text-xo-muted', label: result };
  return (
    <span className={`rounded-full border px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function LogRow({ log }: { log: UserLog }) {
  const [expanded, setExpanded] = useState(false);
  const evt = log.eventType || 'unknown';
  const cfg = eventConfig[evt] || { label: evt, color: 'text-xo-muted', icon: Clock };
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
          hasDetails ? 'cursor-pointer hover:bg-xo-cyan/[0.04] hover:border-xo-cyan/15' : 'cursor-default'
        } ${expanded ? 'border-xo-cyan/20 bg-xo-cyan/[0.05]' : 'border-xo-cyan/5 bg-xo-bg-soft/40'}`}
      >
        <div className="flex flex-wrap items-start gap-2.5 sm:flex-nowrap sm:items-center">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-xo-panel/70 ${cfg.color}`}>
            <Icon size={14} />
          </div>

          <div className="min-w-0 flex-1">
            <p className={`text-[13px] font-medium ${cfg.color}`}>{cfg.label}</p>
            <p className="mt-0.5 font-mono text-[10px] text-xo-muted/70">
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
                <ChevronUp size={14} className="ml-1 text-xo-cyan/40" />
              ) : (
                <ChevronDown size={14} className="ml-1 text-xo-muted/70 transition-colors group-hover:text-xo-cyan/40" />
              )
            ) : null}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="-mt-1.5 rounded-b-2xl border border-t-0 border-xo-cyan/10 bg-xo-cyan/[0.02] px-4 py-3 sm:pl-14">
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
      <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-xo-muted/70 sm:w-24">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono text-xo-muted break-all' : ''} ${highlight ? 'text-xo-cyan font-semibold' : ''} ${valueClass || (!highlight && !mono ? 'text-xo-text/80' : '')}`}>
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
      <span className="shrink-0 text-xs text-xo-muted/70">
        {formatDateNumeric(iapTransactionDisplayTime(transaction))}
      </span>
      <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
        TXN
      </span>
      <span className="shrink-0 font-mono text-xs font-bold text-emerald-400">
        {transaction.orderId || 'unknown'}
      </span>
      {detailStr && (
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-xo-muted/70">
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
          hasDetails ? 'cursor-pointer hover:bg-xo-cyan/[0.04] hover:border-xo-cyan/15' : 'cursor-default'
        } ${expanded ? 'border-xo-cyan/20 bg-xo-cyan/[0.05]' : 'border-xo-cyan/5 bg-xo-bg-soft/40'}`}
      >
        <div className="flex flex-wrap items-start gap-2.5 sm:flex-nowrap sm:items-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-xo-panel/70 text-emerald-400">
            <ShoppingCart size={14} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-emerald-400">Purchase</p>
            <p className="mt-0.5 font-mono text-[10px] text-xo-muted/70">
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
                <ChevronUp size={14} className="ml-1 text-xo-cyan/40" />
              ) : (
                <ChevronDown size={14} className="ml-1 text-xo-muted/70 transition-colors group-hover:text-xo-cyan/40" />
              )
            ) : null}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="-mt-1.5 rounded-b-2xl border border-t-0 border-xo-cyan/10 bg-xo-cyan/[0.02] px-4 py-3 sm:pl-14">
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
  const { t } = useLanguage();
  const { data: users, loading: usersLoading } = useUsers();
  const { data: allLogs } = useUserLogs();
  const { data: liveArenaRooms } = useArenaRooms({ limitCount: 300 });
  const { data: archivedArenaRooms } = useArchivedRooms({ initialLimit: 200, pageSize: 100 });
  const { data: deletionRequests } = useDeletionRequests();
  const { addToWatchlist, removeFromWatchlist, isWatched } = useWatchlistStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<UserSortKey>('online');
  const [filterKey, setFilterKey] = useState<UserFilterKey>('all');
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Set of uids with pending deletion requests — used by the filter chip
  // and visible on the player header.
  const deletionRequestUids = useMemo(() => {
    const s = new Set<string>();
    for (const d of deletionRequests) {
      if (d.uid) s.add(d.uid);
    }
    return s;
  }, [deletionRequests]);

  // Deep-link: /users?uid=<uid> auto-selects that player on first render.
  // Clears the param once consumed so refreshing without the param works.
  useEffect(() => {
    const urlUid = searchParams.get('uid');
    if (urlUid && urlUid !== selectedUid) {
      setSelectedUid(urlUid);
      const next = new URLSearchParams(searchParams);
      next.delete('uid');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
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
    loadingMore: transactionsLoadingMore,
    hasMore: transactionsHasMore,
    loadMore: loadMoreTransactions,
  } = useUserTransactionsForUser(
    { uid: selectedUid, email: selectedUser?.Profile?.email },
    { liveLimit: 100, pageSize: 100 }
  );

  const {
    data: userRoomHistory,
    loading: roomHistoryLoading,
    loadingMore: roomHistoryLoadingMore,
    hasMore: roomHistoryHasMore,
    loadMore: loadMoreRoomHistory,
  } = useRoomHistoryForUser(targetAuthUid, { liveLimit: 50, pageSize: 50 });

  const {
    data: userPurchaseOrders,
    loading: purchaseOrdersLoading,
    error: purchaseOrdersError,
  } = usePurchaseOrdersForUser(targetAuthUid);

  const {
    data: walletLedger,
    loading: walletLedgerLoading,
    error: walletLedgerError,
  } = useWalletLedgerForUser(targetAuthUid);

  const {
    data: ownedAvatars,
    loading: ownedAvatarsLoading,
  } = useOwnedAvatarsForUser(targetAuthUid);

  const opponents = useMemo(() => {
    const opponentMap = new Map<string, { uid: string; name?: string; count: number }>();
    for (const match of userRoomHistory) {
      for (const p of match.players ?? []) {
        if (p.uid === targetAuthUid) continue;
        const existing = opponentMap.get(p.uid);
        if (existing) {
          existing.count++;
        } else {
          opponentMap.set(p.uid, { uid: p.uid, name: p.displayName, count: 1 });
        }
      }
    }
    return [...opponentMap.values()].sort((a, b) => b.count - a.count);
  }, [userRoomHistory, targetAuthUid]);

  // Merge live + archived rooms where this player was host or guest.
  const playerLiveAndArchivedRooms = useMemo(() => {
    if (!targetAuthUid) return [] as Array<ArenaRoom & { __source: 'live' | 'archive' }>;
    const out: Array<ArenaRoom & { __source: 'live' | 'archive' }> = [];
    const seen = new Set<string>();
    for (const r of liveArenaRooms) {
      if (r.hostUid === targetAuthUid || r.guestUid === targetAuthUid) {
        const key = r.matchId || r.roomCode;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ ...r, __source: 'live' });
        }
      }
    }
    for (const r of archivedArenaRooms) {
      if (r.hostUid === targetAuthUid || r.guestUid === targetAuthUid) {
        const key = r.matchId || r.roomCode;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ ...r, __source: 'archive' });
        }
      }
    }
    out.sort((a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0));
    return out;
  }, [liveArenaRooms, archivedArenaRooms, targetAuthUid]);

  const selectedHasDeletionRequest = selectedUid ? deletionRequestUids.has(selectedUid) : false;

  // Set of auth UIDs that were recently active based on the global event feed.
  // Defined here (before the user list) so it can drive online-first sorting.
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

  const isUserOnlineNow = useMemo(
    () => (u: (typeof users)[number]) => isUserOnline(u) || activeUsersByLatestEvent.has(u.id),
    [activeUsersByLatestEvent]
  );

  const onlineCount = useMemo(
    () => users.reduce((n, u) => n + (isUserOnlineNow(u) ? 1 : 0), 0),
    [users, isUserOnlineNow]
  );

  const filteredUsers = useMemo(() => {
    const term = search.toLowerCase().trim();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const matchesSearch = (u: (typeof users)[number]) => {
      if (!term) return true;
      const email = (u.Profile?.email || '').toLowerCase();
      const name = (u.Profile?.name || u.Profile?.displayName || '').toLowerCase();
      const invite = (u.inviteCode || u.referralCode || '').toLowerCase();
      return (
        email.includes(term) ||
        name.includes(term) ||
        u.id.toLowerCase().includes(term) ||
        (u.uid ?? '').toLowerCase().includes(term) ||
        invite.includes(term)
      );
    };

    const matchesFilter = (u: (typeof users)[number]) => {
      switch (filterKey) {
        case 'online':
          return isUserOnlineNow(u);
        case 'offline':
          return !isUserOnlineNow(u);
        case 'purchases':
          return (u.Wallet?.purchasesCount ?? u.purchasesCount ?? 0) > 0;
        case 'highBalance':
          return (u.Wallet?.coins ?? 0) >= HIGH_BALANCE_THRESHOLD;
        case 'newToday':
          return (toMs(u.createdAt) || 0) >= todayMs;
        case 'suspicious':
          return Boolean(u.watchlisted || u.banned || u.suspended || deletionRequestUids.has(u.id));
        default:
          return true;
      }
    };

    const rows = users.filter((u) => matchesSearch(u) && matchesFilter(u));

    const byOnlineThenSeen = (a: (typeof users)[number], b: (typeof users)[number]) => {
      const oa = isUserOnlineNow(a) ? 1 : 0;
      const ob = isUserOnlineNow(b) ? 1 : 0;
      if (oa !== ob) return ob - oa;
      return toMs(getUserLastSeenValue(b)) - toMs(getUserLastSeenValue(a));
    };

    rows.sort((a, b) => {
      switch (sortKey) {
        case 'newest':
          return toMs(b.createdAt) - toMs(a.createdAt);
        case 'oldest': {
          const ax = toMs(a.createdAt);
          const bx = toMs(b.createdAt);
          if (!ax && !bx) return 0;
          if (!ax) return 1; // unknown dates sink to the bottom
          if (!bx) return -1;
          return ax - bx;
        }
        case 'lastActive':
          return toMs(getUserLastSeenValue(b)) - toMs(getUserLastSeenValue(a));
        case 'coins':
          return (b.Wallet?.coins ?? 0) - (a.Wallet?.coins ?? 0);
        case 'games':
          return (b.Stats?.gamesPlayed ?? 0) - (a.Stats?.gamesPlayed ?? 0);
        case 'online':
        default:
          return byOnlineThenSeen(a, b);
      }
    });

    return rows;
  }, [users, search, sortKey, filterKey, isUserOnlineNow, deletionRequestUids]);

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

  const purchaseOrderStats = useMemo(() => {
    let successCoins = 0;
    let successCount = 0;
    let failedCount = 0;
    let avatarCount = 0;
    let totalNormalizedUsd = 0;
    let lastPurchaseDate: unknown = null;
    let lastProductId: string | null = null;

    for (const o of userPurchaseOrders) {
      const isReal = isRealPurchaseOrder(o);
      const countRevenue = shouldCountForRevenue(o);
      if (!isReal && !countRevenue) continue;
      const ts = purchaseOrderDisplayTime(o);
      if (!lastPurchaseDate) { lastPurchaseDate = ts; lastProductId = o.productId ?? null; }
      if (countRevenue) {
        totalNormalizedUsd += purchaseOrderNormalizedUsd(o);
      }
      if (o.status === 'grant_success') {
        successCount++;
        successCoins += purchaseOrderCoins(o);
      } else if (o.status === 'avatar_unlock_success') {
        avatarCount++;
        successCount++;
      } else if (countRevenue) {
        // Other revenue-counted statuses (e.g. coin_granted_client_fallback)
        successCount++;
        successCoins += purchaseOrderCoins(o);
      }
      if (o.status === 'verification_failed' || o.status === 'grant_failed') failedCount++;
    }

    const knownOrderIds = new Set(userPurchaseOrders.map((o) => o.orderId).filter(Boolean));
    const knownTokenHashes = new Set(userPurchaseOrders.map((o) => o.purchaseTokenHash).filter(Boolean));

    const hasPurchaseOrdersButNoLedger = successCount > 0 && walletLedger.length === 0 && !walletLedgerLoading;
    const hasLedgerButNoPurchaseOrders = walletLedger.length > 0 && userPurchaseOrders.length === 0 && !purchaseOrdersLoading;

    const duplicateOrderIds = (() => {
      const seen = new Set<string>();
      const dups = new Set<string>();
      for (const o of userPurchaseOrders) {
        if (o.orderId) {
          if (seen.has(o.orderId)) dups.add(o.orderId);
          else seen.add(o.orderId);
        }
      }
      return dups;
    })();

    // Admin-only wallet ledger entries (not tied to a purchase_order)
    const adminLedgerEntries = walletLedger.filter(
      (e) => !e.orderId || !knownOrderIds.has(e.orderId)
    ).filter(
      (e) => (e.source ?? '').toLowerCase().includes('admin') || (e.source ?? '').toLowerCase().includes('manual') || (e.source ?? '').toLowerCase().includes('adjust')
    );

    return {
      successCoins,
      successCount,
      failedCount,
      avatarCount,
      totalNormalizedUsd,
      lastPurchaseDate,
      lastProductId,
      hasPurchaseOrdersButNoLedger,
      hasLedgerButNoPurchaseOrders,
      duplicateOrderIds,
      knownOrderIds,
      knownTokenHashes,
      adminLedgerEntries,
    };
  }, [userPurchaseOrders, walletLedger, walletLedgerLoading, purchaseOrdersLoading]);

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
    { value: 'rooms' as const, label: 'Rooms', icon: Swords },
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
        {
          label: 'Invite Code',
          value: selectedUser.inviteCode || selectedUser.referralCode || 'N/A',
        },
      ]
    : [];

  const usersListPanel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-glass-border/60 bg-xo-panel backdrop-blur-xl sm:rounded-[1.5rem]">
      <div className="px-3 pb-3 pt-3.5 sm:px-4 sm:pt-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-xo-cyan/10">
            <User size={14} className="text-xo-cyan" />
          </div>
          <h3 className="font-orbitron text-sm font-bold tracking-wide text-xo-text">{t('masterUsers')}</h3>
          <span className="rounded-full bg-xo-cyan/10 px-2.5 py-0.5 font-orbitron text-[10px] font-bold text-xo-cyan">
            {filteredUsers.length}
          </span>
          {onlineCount > 0 && (
            <span className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-green-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {onlineCount} {t('onlineNow')}
            </span>
          )}
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={t('searchByCodeOrEmail')}
        />

        <div className="mt-2 flex items-center gap-2">
          <ArrowDownUp size={13} className="shrink-0 text-xo-muted" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as UserSortKey)}
            className="min-h-9 w-full appearance-none rounded-full border border-xo-border bg-xo-panel/80 px-3 text-xs text-xo-text outline-none transition-all focus:border-xo-border-active"
            aria-label={t('sortBy')}
          >
            <option value="online">{t('sortOnlineFirst')}</option>
            <option value="newest">{t('sortNewestAccounts')}</option>
            <option value="oldest">{t('sortOldestAccounts')}</option>
            <option value="lastActive">{t('sortLastActive')}</option>
            <option value="coins">{t('sortHighestCoins')}</option>
            <option value="games">{t('sortMostGames')}</option>
          </select>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {([
            ['all', t('filterAll')],
            ['online', t('filterOnline')],
            ['offline', t('filterOffline')],
            ['purchases', t('filterHasPurchases')],
            ['highBalance', t('filterHighBalance')],
            ['newToday', t('filterNewToday')],
            ['suspicious', t('filterSuspicious')],
          ] as [UserFilterKey, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterKey(key)}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-all ${
                filterKey === key
                  ? 'border-xo-cyan/40 bg-xo-cyan/10 text-xo-cyan'
                  : 'border-glass-border text-xo-muted hover:border-xo-cyan/20 hover:text-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-2.5 pb-2">
        {filteredUsers.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-xo-muted/70">No users found</p>
        ) : (
          filteredUsers.map((user) => {
            const isSelected = user.id === selectedUid;
            const isOnline = isUserOnlineNow(user);
            const lastSeenValue = getUserLastSeenValue(user);

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
                    ? 'border-xo-cyan/30 bg-xo-cyan/10 shadow-[0_0_12px_rgba(85,214,255,0.1)]'
                    : 'border-transparent hover:border-xo-cyan/10 hover:bg-xo-cyan/[0.04]'
                }`}
              >
                <UserAvatar
                  photoURL={user.Profile?.photoURL}
                  equippedAvatar={user.Cosmetics?.equippedAvatar}
                  displayName={user.Profile?.displayName || user.Profile?.name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[11px] font-medium ${isSelected ? 'text-xo-cyan' : 'text-xo-text/80'}`}>
                    {user.Profile?.email || `${user.id.slice(0, 12)}...`}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-xo-muted">
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
                      <span className="flex items-center gap-1 text-[10px] text-xo-muted">
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
                    <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gray-500" />
                        <span className="text-[10px] font-semibold text-xo-muted">{t('offline')}</span>
                      </div>
                      {lastSeenValue ? (
                        <span className="text-[9px] text-xo-muted/70" title={formatDate(lastSeenValue)}>
                          {formatRelativeTime(lastSeenValue)}
                        </span>
                      ) : null}
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
          <div className="flex min-h-[50svh] flex-1 items-center justify-center rounded-[1.25rem] border border-glass-border/60 bg-xo-panel p-4 text-center backdrop-blur-xl sm:rounded-[1.5rem]">
            <div className="max-w-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-xo-cyan/5">
                <Search size={24} className="text-xo-cyan/30" />
              </div>
              <p className="text-sm font-medium text-xo-text/80">Select a user to view activity</p>
              <p className="mt-1 text-[11px] text-xo-muted/70 lg:hidden">Open the users drawer to browse accounts.</p>
              <p className="mt-1 hidden text-[11px] text-xo-muted/70 lg:block">Choose from the list on the left.</p>
              <button
                type="button"
                onClick={() => setUsersDrawerOpen(true)}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-xo-cyan/30 bg-xo-cyan/10 px-4 py-2 text-xs font-semibold text-xo-cyan lg:hidden"
              >
                <Menu size={14} />
                Browse users
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem] border border-glass-border/60 bg-xo-panel backdrop-blur-xl sm:rounded-[1.5rem]">
            <div className="border-b border-xo-cyan/5 px-3 py-3 sm:px-4 md:px-5">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => setUsersDrawerOpen(true)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-xo-panel/70 text-xo-text/80 transition-all hover:border-xo-cyan/30 hover:text-xo-cyan lg:hidden"
                  >
                    <Menu size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUid(null)}
                    className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-xo-cyan/5 text-xo-cyan/70 transition-all hover:bg-xo-cyan/10 hover:text-xo-cyan sm:flex"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <UserAvatar
                    photoURL={selectedUser?.Profile?.photoURL}
                    equippedAvatar={selectedUser?.Cosmetics?.equippedAvatar}
                    displayName={selectedUser?.Profile?.displayName || selectedUser?.Profile?.name}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-xo-cyan sm:text-base">
                      {selectedUser?.Profile?.email || selectedUid}
                    </p>
                    <p className="mt-1 break-all font-mono text-[10px] text-xo-muted/70">{selectedUid}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUsersDrawerOpen(true)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-glass-border bg-xo-bg-soft/50 px-3 py-2 text-[11px] text-xo-text/80 lg:hidden"
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
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-500/15 bg-gray-500/5 px-3 py-1 text-[11px] font-medium text-xo-muted">
                    <WifiOff size={11} />
                    <span className="truncate">{selectedLastSeen ? `Last seen ${formatDate(selectedLastSeen)}` : 'Offline'}</span>
                  </span>
                )}

                <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-xo-cyan/15 bg-xo-cyan/5 px-3 py-1 text-[11px] font-medium text-xo-cyan">
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
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-[11px] text-xo-muted">
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
                  <span className="rounded-full border border-xo-cyan/20 bg-xo-cyan/10 px-3 py-1 text-[11px] font-medium text-xo-cyan">
                    Suspended
                  </span>
                )}
                {selectedUser?.isPremium && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-xo-cyan/20 bg-xo-cyan/10 px-3 py-1 text-[11px] font-medium text-xo-cyan">
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
                {selectedHasDeletionRequest && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-300">
                    Deletion requested
                  </span>
                )}
                {(selectedUser?.inviteCode || selectedUser?.referralCode) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-purple/15 bg-neon-purple/5 px-3 py-1 text-[11px] font-medium text-neon-purple">
                    <Share2 size={11} />
                    Code: {selectedUser.inviteCode || selectedUser.referralCode}
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
                    <div className="flex rounded-full border border-xo-cyan/10 bg-xo-bg-soft/50 p-1">
                      <button
                        type="button"
                        onClick={() => setViewMode('cards')}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 ${
                          viewMode === 'cards'
                            ? 'bg-xo-cyan/15 text-xo-cyan'
                            : 'text-xo-muted hover:text-xo-text/80'
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
                            ? 'bg-xo-cyan/15 text-xo-cyan'
                            : 'text-xo-muted hover:text-xo-text/80'
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
                    valueClassName="font-orbitron text-xo-cyan"
                  />
                  <StatsCard label="Provider" value={selectedUser?.Profile?.provider || 'N/A'} />
                  <StatsCard label="Last Active" value={selectedLastSeen ? formatDate(selectedLastSeen) : 'N/A'} />
                  <StatsCard
                    label="Total Matches"
                    value={String(selectedUser?.Stats?.gamesPlayed ?? gameStats.matches ?? 0)}
                    valueClassName="font-orbitron text-xo-cyan"
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-xo-cyan/5">
                        <Gamepad2 size={16} className="text-xo-cyan/30" />
                      </div>
                      <p className="text-xs text-xo-muted/70">No game activity found</p>
                    </div>
                  ) : viewMode === 'raw' ? (
                    <div className="overflow-hidden rounded-2xl border border-xo-cyan/10 bg-xo-panel/70 font-mono">
                      {filteredLogs.map((log) => <RawLogEntry key={log.id} log={log} />)}
                    </div>
                  ) : (
                    filteredLogs.map((log) => <LogRow key={log.id} log={log} />)
                  )}

                  {(hasMore || loadingMore) && (
                    <div className="flex items-center justify-center border-t border-xo-cyan/10 p-3">
                      {hasMore ? (
                        <button
                          type="button"
                          onClick={() => {
                            void loadMore();
                          }}
                          disabled={loadingMore}
                          className="rounded-full border border-xo-cyan/30 bg-xo-cyan/10 px-4 py-1.5 text-xs font-semibold text-xo-cyan transition-colors hover:bg-xo-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loadingMore ? 'Loading...' : 'Load older logs'}
                        </button>
                      ) : (
                        <span className="text-xs text-xo-muted/70">No older logs</span>
                      )}
                    </div>
                  )}
                </>
              ) : activeTab === 'purchases' ? (
                <div className="space-y-4">
                  {/* Warnings */}
                  {purchaseOrderStats.hasPurchaseOrdersButNoLedger && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                      ⚠ Purchase orders show successful grants but wallet_ledger is empty.
                    </div>
                  )}
                  {purchaseOrderStats.hasLedgerButNoPurchaseOrders && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                      ⚠ Wallet ledger entries exist but no purchase_orders found for this user.
                    </div>
                  )}
                  {purchaseOrderStats.duplicateOrderIds.size > 0 && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                      ⚠ Duplicate order IDs detected in purchase_orders: {[...purchaseOrderStats.duplicateOrderIds].join(', ')}
                    </div>
                  )}
                  {purchaseOrdersError?.message?.includes('permission-denied') && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                      Permission denied reading purchase_orders. Deploy Firestore rules: firebase deploy --only firestore:rules
                    </div>
                  )}
                  {purchaseOrdersError && !purchaseOrdersError.message?.includes('permission-denied') && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                      ⚠ Firestore index required for per-user purchase history.
                      Run: <span className="font-mono">firebase deploy --only firestore:indexes</span>
                      {' '}— showing unordered results as fallback.
                    </div>
                  )}

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="font-orbitron text-lg font-bold text-emerald-400">{purchaseOrderStats.successCount}</p>
                      <p className="text-[10px] text-xo-muted">Successful Purchases</p>
                    </div>
                    <div className="rounded-2xl border border-xo-cyan/20 bg-xo-cyan/5 p-3">
                      <p className="font-orbitron text-lg font-bold text-xo-cyan">{purchaseOrderStats.successCoins.toLocaleString()}</p>
                      <p className="text-[10px] text-xo-muted">Total Coins Bought</p>
                    </div>
                    <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-3">
                      <p className="font-orbitron text-lg font-bold text-green-400">{formatCurrency(purchaseOrderStats.totalNormalizedUsd)}</p>
                      <p className="text-[10px] text-xo-muted">Normalized Revenue</p>
                      <p className="text-[9px] text-xo-muted/70">2000 coins = $1</p>
                    </div>
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
                      <p className="font-orbitron text-lg font-bold text-red-400">{purchaseOrderStats.failedCount}</p>
                      <p className="text-[10px] text-xo-muted">Failed After Payment</p>
                    </div>
                    <div className="rounded-2xl border border-neon-purple/20 bg-neon-purple/5 p-3">
                      <p className="font-orbitron text-lg font-bold text-neon-purple">{purchaseOrderStats.avatarCount}</p>
                      <p className="text-[10px] text-xo-muted">Avatar Purchases</p>
                    </div>
                    {purchaseOrderStats.lastPurchaseDate != null && (
                      <div className="rounded-2xl border border-glass-border/60 bg-xo-bg-soft/40 p-3">
                        <p className="text-xs font-semibold text-xo-text/80">{formatDate(purchaseOrderStats.lastPurchaseDate)}</p>
                        <p className="text-[10px] text-xo-muted">Last Purchase</p>
                      </div>
                    )}
                    {purchaseOrderStats.lastProductId && (
                      <div className="rounded-2xl border border-glass-border/60 bg-xo-bg-soft/40 p-3">
                        <p className="font-mono text-xs text-xo-text/80 break-all">{purchaseOrderStats.lastProductId}</p>
                        <p className="text-[10px] text-xo-muted">Last Product ID</p>
                      </div>
                    )}
                  </div>

                  {/* Purchase Orders */}
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-xo-muted">
                      Purchase Orders ({userPurchaseOrders.length})
                    </p>
                    {purchaseOrdersLoading ? (
                      <div className="flex h-20 items-center justify-center"><LoadingSpinner /></div>
                    ) : userPurchaseOrders.length === 0 ? (
                      <p className="rounded-xl border border-glass-border/40 bg-xo-bg-soft/40 p-3 text-xs text-xo-muted">
                        No purchase orders found
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {userPurchaseOrders.map((o) => {
                          const isNoise = isNoisePurchaseOrder(o);
                          const isRevenueCounted = shouldCountForRevenue(o);
                          const coins = purchaseOrderCoins(o);
                          const normUsd = purchaseOrderNormalizedUsd(o);
                          const statusStyle =
                            o.status === 'grant_success' || o.status === 'avatar_unlock_success' || isRevenueCounted
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : o.status === 'already_processed'
                              ? 'border-yellow-500/30 bg-yellow-500/5'
                              : o.status === 'verification_failed' || o.status === 'grant_failed'
                              ? 'border-red-500/30 bg-red-500/5'
                              : isNoise
                              ? 'border-glass-border/30 bg-black/10 opacity-50'
                              : 'border-glass-border/50 bg-xo-bg-soft/40';
                          return (
                            <div key={o.id} className={`rounded-xl border p-3 ${statusStyle}`}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    o.status === 'grant_success' || o.status === 'avatar_unlock_success'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : o.status === 'already_processed'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : o.status === 'verification_failed' || o.status === 'grant_failed'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-gray-500/20 text-xo-muted'
                                  }`}>
                                    {o.status || 'unknown'}
                                  </span>
                                  {o.productType === 'avatar' && (
                                    <span className="rounded-full bg-neon-purple/20 px-2 py-0.5 text-[10px] font-semibold text-neon-purple">Avatar</span>
                                  )}
                                  {o.verified && (
                                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">Verified</span>
                                  )}
                                  {isRevenueCounted && o.status !== 'grant_success' && o.status !== 'avatar_unlock_success' && (
                                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Revenue counted</span>
                                  )}
                                  {isNoise && (
                                    <span className="rounded-full bg-gray-500/20 px-2 py-0.5 text-[10px] text-xo-muted">Debug/noise</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {coins > 0 && (
                                    <span className="font-orbitron text-xs font-bold text-xo-cyan">+{coins.toLocaleString()}</span>
                                  )}
                                  {normUsd > 0 && (
                                    <span className="text-[10px] text-green-400">{formatCurrency(normUsd)}</span>
                                  )}
                                  <span className="text-[10px] text-xo-muted">{formatDate(purchaseOrderDisplayTime(o))}</span>
                                </div>
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-xo-muted">
                                {o.productId && <span>product: <span className="font-mono text-xo-muted">{o.productId}</span></span>}
                                {o.orderId && (
                                  <span className="flex items-center gap-1">
                                    order: <span className="font-mono text-xo-muted">{o.orderId.slice(0, 16)}{o.orderId.length > 16 ? '…' : ''}</span>
                                    <CopyButton value={o.orderId} label="order id" size="xs" />
                                  </span>
                                )}
                                {o.platform && <span>platform: <span className="text-xo-muted">{o.platform}</span></span>}
                                {(o.balanceBefore !== undefined && o.balanceAfter !== undefined) && (
                                  <span>balance: <span className="text-xo-muted">{Number(o.balanceBefore).toLocaleString()} → {Number(o.balanceAfter).toLocaleString()}</span></span>
                                )}
                                {(o.error || o.errorCode) && (
                                  <span className="text-red-400">error: {String(o.error || o.errorCode)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Wallet Ledger */}
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-xo-muted">
                      Coin Wallet Ledger ({walletLedger.length})
                    </p>
                    {walletLedgerError?.message?.includes('permission-denied') && (
                      <p className="rounded-xl border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-400 mb-2">
                        Permission denied reading wallet_ledger.
                      </p>
                    )}
                    {walletLedgerLoading ? (
                      <div className="flex h-16 items-center justify-center"><LoadingSpinner /></div>
                    ) : walletLedger.length === 0 ? (
                      <p className="rounded-xl border border-glass-border/40 bg-xo-bg-soft/40 p-3 text-xs text-xo-muted">
                        No wallet ledger entries found
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border border-glass-border/40 bg-xo-bg-soft/40">
                        {walletLedger.map((entry) => (
                          <div key={entry.id} className="flex flex-wrap items-center gap-3 border-b border-glass-border/20 px-3 py-2.5 text-xs last:border-0">
                            <span className="font-mono text-[10px] text-xo-muted/70 shrink-0">{formatDate(entry.createdAt)}</span>
                            {(entry.coinsAdded ?? 0) !== 0 && (
                              <span className={`font-orbitron text-xs font-bold ${Number(entry.coinsAdded) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {Number(entry.coinsAdded) > 0 ? '+' : ''}{Number(entry.coinsAdded).toLocaleString()}
                              </span>
                            )}
                            {entry.balanceBefore !== undefined && entry.balanceAfter !== undefined && (
                              <span className="text-xo-muted">
                                {Number(entry.balanceBefore).toLocaleString()} → {Number(entry.balanceAfter).toLocaleString()}
                              </span>
                            )}
                            {entry.source && (
                              <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] text-xo-muted">{String(entry.source)}</span>
                            )}
                            {entry.productId && <span className="font-mono text-[10px] text-xo-muted">{String(entry.productId)}</span>}
                            {entry.orderId && (
                              <span className="flex items-center gap-1 font-mono text-[10px] text-xo-muted/70">
                                {String(entry.orderId).slice(0, 12)}…
                                <CopyButton value={String(entry.orderId)} label="order id" size="xs" />
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Owned Avatars */}
                  {(ownedAvatarsLoading || ownedAvatars.length > 0) && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-xo-muted">
                        Premium Avatars ({ownedAvatars.length})
                      </p>
                      {ownedAvatarsLoading ? (
                        <div className="flex h-16 items-center justify-center"><LoadingSpinner /></div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {ownedAvatars.map((av) => (
                            <div key={av.id} className="rounded-xl border border-neon-purple/20 bg-neon-purple/5 p-3 text-xs min-w-[120px]">
                              <p className="font-semibold text-neon-purple">
                                {av.avatarId !== undefined ? `Avatar #${av.avatarId}` : av.id.slice(0, 8)}
                              </p>
                              {av.productId && <p className="font-mono text-[10px] text-xo-muted mt-0.5">{String(av.productId)}</p>}
                              {av.avatarAsset && <p className="font-mono text-[10px] text-xo-muted/70 break-all">{String(av.avatarAsset)}</p>}
                              <p className="text-[10px] text-xo-muted/70 mt-1">{formatDate(av.ownedAt ?? av.unlockedAt)}</p>
                              {av.source && <p className="text-[10px] text-xo-muted">{String(av.source)}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Manual Adjustments */}
                  {purchaseOrderStats.adminLedgerEntries.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-500/80">
                        Manual Admin Adjustments ({purchaseOrderStats.adminLedgerEntries.length})
                      </p>
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-300/70 mb-2">
                        Manual corrections — not Google Play purchases. Not counted in revenue.
                      </div>
                      <div className="space-y-1">
                        {purchaseOrderStats.adminLedgerEntries.map((e) => (
                          <div key={e.id} className="flex items-center justify-between rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2">
                            <div>
                              <p className="text-[10px] text-amber-300/80">{e.source ?? 'admin_adjustment'}</p>
                              <p className="text-[9px] text-xo-muted/70">{formatDate(e.createdAt)}</p>
                            </div>
                            <p className="font-orbitron text-xs text-amber-400">
                              {typeof e.coinsAdded === 'number' && e.coinsAdded >= 0 ? '+' : ''}{e.coinsAdded ?? 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legacy IAP Transactions */}
                  {userTransactions.length > 0 && (
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-xo-muted">
                        Legacy Transactions ({userTransactions.length})
                      </p>
                      {viewMode === 'raw' ? (
                        <div className="overflow-hidden rounded-2xl border border-xo-cyan/10 bg-xo-panel/70 font-mono">
                          {userTransactions.map((tx) => <RawTransactionEntry key={tx.id} transaction={tx} />)}
                        </div>
                      ) : (
                        userTransactions.map((tx) => <TransactionRow key={tx.id} transaction={tx} />)
                      )}

                      {(transactionsHasMore || transactionsLoadingMore) && (
                        <div className="flex items-center justify-center border-t border-xo-cyan/10 p-3">
                          {transactionsHasMore ? (
                            <button
                              type="button"
                              onClick={() => { void loadMoreTransactions(); }}
                              disabled={transactionsLoadingMore}
                              className="rounded-full border border-xo-cyan/30 bg-xo-cyan/10 px-4 py-1.5 text-xs font-semibold text-xo-cyan transition-colors hover:bg-xo-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {transactionsLoadingMore ? 'Loading...' : 'Load older purchases'}
                            </button>
                          ) : (
                            <span className="text-xs text-xo-muted/70">No older purchases</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : activeTab === 'rooms' ? (
                <>
                  <div className="mb-3 grid grid-cols-3 gap-3">
                    <StatsCard label="Rooms Played" value={String(userRoomHistory.length)} />
                    <StatsCard label="Unique Opponents" value={String(opponents.length)} />
                    <StatsCard label="Live & Archived" value={String(playerLiveAndArchivedRooms.length)} />
                  </div>
                  {playerLiveAndArchivedRooms.length > 0 && (
                    <div className="mb-4 rounded-2xl border border-glass-border/60 bg-xo-bg-soft/40 p-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-xo-muted">
                        Live & archived rooms
                      </p>
                      <div className="space-y-2">
                        {playerLiveAndArchivedRooms.slice(0, 30).map((r) => {
                          const opponentUid =
                            r.hostUid === targetAuthUid ? r.guestUid : r.hostUid;
                          const opponentName =
                            r.hostUid === targetAuthUid
                              ? (r.guestName ?? (opponentUid ? shortUid(opponentUid) : '—'))
                              : (r.hostName ?? (opponentUid ? shortUid(opponentUid) : '—'));
                          const winnerUid = r.roomWinnerUid ?? r.winnerUid;
                          const isWin = winnerUid != null && winnerUid === targetAuthUid;
                          const isLoss =
                            winnerUid != null && opponentUid != null && winnerUid === opponentUid;
                          return (
                            <div
                              key={`${r.__source}:${r.matchId || r.roomCode}`}
                              className="flex flex-wrap items-center gap-2 rounded-xl border border-glass-border/40 bg-xo-bg-soft/50 px-3 py-2 text-xs"
                            >
                              <span className="font-mono font-semibold text-neon-cyan">
                                #{r.roomCode}
                              </span>
                              <CopyButton value={r.roomCode} label="room code" size="xs" />
                              <StatusBadge status={r.status} size="xs" />
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  r.__source === 'live'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-gray-500/10 text-xo-muted'
                                }`}
                              >
                                {r.__source === 'live' ? 'Live' : 'Archive'}
                              </span>
                              <span className="text-xo-muted">vs {opponentName}</span>
                              {r.betEnabled && (
                                <span className="rounded-full bg-xo-cyan/10 px-2 py-0.5 text-[10px] font-semibold text-xo-cyan">
                                  Bet {r.betAmount ?? '?'}
                                </span>
                              )}
                              {isWin && (
                                <span className="text-[10px] font-semibold text-emerald-300">Won</span>
                              )}
                              {isLoss && (
                                <span className="text-[10px] font-semibold text-red-400">Lost</span>
                              )}
                              <span className="ms-auto text-[10px] text-xo-muted/70">
                                {r.createdAt ? formatRelativeTime(r.createdAt) : '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {roomHistoryLoading ? (
                    <div className="flex h-32 items-center justify-center">
                      <LoadingSpinner />
                    </div>
                  ) : userRoomHistory.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-xo-cyan/5">
                        <Swords size={16} className="text-xo-cyan/30" />
                      </div>
                      <p className="text-xs text-xo-muted/70">No room history found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {opponents.length > 0 && (
                        <div className="rounded-2xl border border-glass-border/50 bg-xo-bg-soft/50 p-3">
                          <p className="mb-2 text-[10px] font-semibold tracking-wider text-xo-muted uppercase">Top Opponents</p>
                          <div className="flex flex-wrap gap-2">
                            {opponents.slice(0, 10).map((opp) => (
                              <span key={opp.uid} className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-xo-panel/70 px-2.5 py-1 text-[10px] text-xo-text/80">
                                {opp.name || opp.uid.slice(0, 8)}
                                <span className="font-semibold text-xo-cyan">{opp.count}x</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {userRoomHistory.map((match) => (
                        <div key={match.id} className="rounded-xl border border-glass-border/40 bg-xo-bg-soft/40 px-3 py-2.5">
                          <div className="flex items-center gap-2 text-xs">
                            {match.roomCode && (
                              <span className="font-mono font-semibold text-neon-cyan">{match.roomCode}</span>
                            )}
                            <span className="font-mono text-[10px] text-xo-muted/70">{match.id.slice(0, 8)}</span>
                            {match.status && (
                              <span className="rounded-full bg-glass-bg px-2 py-0.5 text-[10px] text-xo-muted">{match.status}</span>
                            )}
                            {match.winner && (
                              <span className={`text-[10px] font-semibold ${match.winner === targetAuthUid ? 'text-green-400' : 'text-red-400'}`}>
                                {match.winner === targetAuthUid ? 'Won' : 'Lost'}
                              </span>
                            )}
                          </div>
                          {match.players && match.players.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-2">
                              {match.players.filter((p) => p.uid !== targetAuthUid).map((p) => (
                                <span key={p.uid} className="text-[10px] text-xo-muted">
                                  vs {p.displayName || p.email || p.uid.slice(0, 8)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {(roomHistoryHasMore || roomHistoryLoadingMore) && (
                    <div className="flex items-center justify-center border-t border-xo-cyan/10 p-3">
                      {roomHistoryHasMore ? (
                        <button
                          type="button"
                          onClick={() => { void loadMoreRoomHistory(); }}
                          disabled={roomHistoryLoadingMore}
                          className="rounded-full border border-xo-cyan/30 bg-xo-cyan/10 px-4 py-1.5 text-xs font-semibold text-xo-cyan transition-colors hover:bg-xo-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {roomHistoryLoadingMore ? 'Loading...' : 'Load older rooms'}
                        </button>
                      ) : (
                        <span className="text-xs text-xo-muted/70">No older rooms</span>
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-xo-cyan/5">
                        <Terminal size={16} className="text-xo-cyan/30" />
                      </div>
                      <p className="text-xs text-xo-muted/70">No account logs found</p>
                      {logsAuditError && (
                        <p className="text-[10px] text-amber-500">Audit logs unavailable: {logsAuditError.message}</p>
                      )}
                    </div>
                  ) : viewMode === 'raw' ? (
                    <div className="overflow-hidden rounded-2xl border border-xo-cyan/10 bg-xo-panel/70 font-mono">
                      {userLogs.map((log) => <RawLogEntry key={log.id} log={log} />)}
                    </div>
                  ) : (
                    userLogs.map((log) => <LogRow key={log.id} log={log} />)
                  )}
                </>
              ) : (
                <div className="space-y-3 pb-3">
                  <div className="xo-card xo-rim relative overflow-hidden p-5 text-center">
                    <span className="pointer-events-none absolute -end-8 -top-8 h-28 w-28 rounded-full bg-coin/15 blur-2xl" aria-hidden />
                    <div className="relative">
                      <div className="flex items-center justify-center gap-2 text-coin">
                        <Coins size={20} />
                        <p className="font-orbitron text-3xl font-bold tabular-nums">
                          {(selectedUser?.Wallet?.coins ?? 0).toLocaleString()}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-xo-muted">
                        {t('totalCoinsBalance')}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-xo-cyan/20 bg-xo-bg-soft/50 p-4">
                    <p className="text-[11px] font-semibold text-xo-cyan">Coin Management</p>
                    <p className="mt-1 text-[10px] text-xo-muted">Use quick amounts or custom value, then apply add/remove.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[50, 100, 500, 1000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setCoinAmount(String(v))}
                          className="rounded-full border border-xo-cyan/20 bg-xo-cyan/10 px-3 py-1 text-[10px] font-semibold text-xo-cyan transition-colors hover:bg-xo-cyan/20"
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
                        className="w-full rounded-xl border border-glass-border bg-xo-panel/70 px-3 py-2 text-xs text-gray-200 outline-none focus:border-xo-cyan/40 sm:w-36"
                        placeholder="Amount"
                      />
                      <input
                        value={actionReason}
                        onChange={(e) => setActionReason(e.target.value)}
                        className="w-full min-w-0 flex-1 rounded-xl border border-glass-border bg-xo-panel/70 px-3 py-2 text-xs text-gray-200 outline-none focus:border-xo-cyan/40"
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
                        className="w-full rounded-full bg-xo-cyan px-4 py-2 text-xs font-bold text-xo-bg-deep shadow-[0_0_15px_rgba(85,214,255,0.25)] disabled:opacity-60 sm:w-auto"
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

                  <div className="rounded-2xl border border-glass-border/50 bg-xo-bg-soft/50 p-4">
                    <p className="text-[11px] font-semibold text-xo-text">Admin Actions</p>
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
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-xo-danger/30 bg-xo-danger/10 px-4 py-2 text-xs font-bold text-xo-danger disabled:opacity-60 sm:w-auto"
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
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-xo-cyan/30 bg-xo-cyan/10 px-4 py-2 text-xs font-bold text-xo-cyan disabled:opacity-60 sm:w-auto"
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
