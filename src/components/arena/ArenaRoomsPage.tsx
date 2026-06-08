import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Archive, CheckCircle, Clock, Coins, Swords, Wifi, Zap } from 'lucide-react';
import { useArenaRooms } from '../../hooks/useArenaRooms';
import { useArchivedRooms } from '../../hooks/useArchivedRooms';
import { useUsers } from '../../hooks/useUsers';
import { GlassCard } from '../shared/GlassCard';
import { SearchInput } from '../shared/SearchInput';
import { StatCard } from '../shared/StatCard';
import { EmptyState } from '../shared/EmptyState';
import { ErrorState } from '../shared/ErrorState';
import { SkeletonLoader } from '../shared/SkeletonLoader';
import { RoomCard } from './RoomCard';
import { RoomDetailsDrawer } from './RoomDetailsDrawer';
import { cn } from '../../utils/cn';
import { usersById } from '../../utils/avatar';
import { ACTIVE_ROOM_STATUSES, type ArenaRoom, type RoomStatus } from '../../types/room';
import type { RtdbError } from '../../hooks/useRealtimeDatabase';
import { RTDB_DATABASE_URL } from '../../firebase/config';
import { IconBadge } from '../shared/IconBadge';

type StatusFilter = RoomStatus | 'all';
type BetFilter = 'any' | 'with' | 'without';

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'ready', label: 'Ready' },
  { value: 'countdown', label: 'Countdown' },
  { value: 'playing', label: 'Playing' },
  { value: 'round_end', label: 'Round End' },
  { value: 'finished', label: 'Finished' },
  { value: 'abandoned', label: 'Abandoned' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

const BET_FILTERS: Array<{ value: BetFilter; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'with', label: 'With Bet' },
  { value: 'without', label: 'Without Bet' },
];

type ActiveTab = 'live' | 'archived';

export function ArenaRoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialBet = searchParams.get('bet') === 'with' ? 'with' : 'any';
  const [tab, setTab] = useState<ActiveTab>('live');
  const liveQuery = useArenaRooms({ limitCount: 300 });
  const archivedQuery = useArchivedRooms({ initialLimit: 100, pageSize: 100 });
  const { data: appUsers } = useUsers();
  const usersMap = useMemo(() => usersById(appUsers), [appUsers]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [betFilter, setBetFilter] = useState<BetFilter>(initialBet);
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<ArenaRoom | null>(null);

  useEffect(() => {
    // Sync bet filter to URL so deep links from the dashboard preset filters work.
    if (betFilter === 'with' && searchParams.get('bet') !== 'with') {
      const next = new URLSearchParams(searchParams);
      next.set('bet', 'with');
      setSearchParams(next, { replace: true });
    } else if (betFilter !== 'with' && searchParams.get('bet')) {
      const next = new URLSearchParams(searchParams);
      next.delete('bet');
      setSearchParams(next, { replace: true });
    }
  }, [betFilter, searchParams, setSearchParams]);

  const activeRooms = tab === 'live' ? liveQuery.data : archivedQuery.data;
  const activeLoading = tab === 'live' ? liveQuery.loading : archivedQuery.loading;
  const activeError = tab === 'live' ? (liveQuery.error as RtdbError | null) : archivedQuery.error;

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeRooms.filter((room) => {
      if (statusFilter !== 'all' && room.status !== statusFilter) return false;
      if (betFilter === 'with' && !room.betEnabled) return false;
      if (betFilter === 'without' && room.betEnabled) return false;
      if (!q) return true;
      if (room.roomCode.toLowerCase().includes(q)) return true;
      if (room.hostName?.toLowerCase().includes(q)) return true;
      if (room.guestName?.toLowerCase().includes(q)) return true;
      if (room.hostUid?.toLowerCase().includes(q)) return true;
      if (room.guestUid?.toLowerCase().includes(q)) return true;
      if (room.matchId?.toLowerCase().includes(q)) return true;
      if (room.players) {
        for (const p of Object.values(room.players)) {
          if (p.uid?.toLowerCase().includes(q)) return true;
          if (p.displayName?.toLowerCase().includes(q)) return true;
          if (p.email?.toLowerCase().includes(q)) return true;
        }
      }
      return false;
    });
  }, [activeRooms, statusFilter, betFilter, search]);

  const stats = useMemo(() => {
    let total = 0;
    let active = 0;
    let waiting = 0;
    let playing = 0;
    let finished = 0;
    let withBet = 0;
    for (const r of activeRooms) {
      total += 1;
      if (r.status && ACTIVE_ROOM_STATUSES.has(r.status)) active += 1;
      if (r.status === 'waiting') waiting += 1;
      if (r.status === 'playing') playing += 1;
      if (r.status === 'finished') finished += 1;
      if (r.betEnabled) withBet += 1;
    }
    return { total, active, waiting, playing, finished, withBet };
  }, [activeRooms]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (tab !== 'live') return;
    console.info(`[Rooms] active count: ${stats.active}`);
    console.info(`[Rooms] waiting count: ${stats.waiting}`);
    console.info(`[Rooms] finished count: ${stats.finished}`);
  }, [tab, stats.active, stats.waiting, stats.finished]);

  // Keep the selected room in sync with live data so the drawer updates as the room mutates.
  const selectedKey = selectedRoom?.matchId || selectedRoom?.roomCode || null;
  const liveSelected = useMemo(() => {
    if (!selectedKey) return null;
    return (
      activeRooms.find((r) => (r.matchId || r.roomCode) === selectedKey) ?? selectedRoom ?? null
    );
  }, [selectedKey, activeRooms, selectedRoom]);

  const isLiveTab = tab === 'live';
  const archivedCount = archivedQuery.data.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <IconBadge icon={Swords} variant="rooms" size="md" hex pulse={isLiveTab && stats.active > 0} />
        <h1 className="font-orbitron text-lg font-bold text-xo-text sm:text-xl">Arena Rooms</h1>
        {isLiveTab && !liveQuery.loading && (
          <span className="rounded-full bg-xo-cyan/10 px-2.5 py-0.5 text-xs font-semibold text-xo-cyan">
            {liveQuery.data.length} live
          </span>
        )}
        {!archivedQuery.loading && (
          <span className="rounded-full border border-glass-border bg-glass-bg px-2.5 py-0.5 text-xs font-semibold text-gray-400">
            {archivedCount} archived
          </span>
        )}
        {isLiveTab && stats.active > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            {stats.active} active
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-2xl border border-glass-border bg-glass-bg p-1">
        <TabButton active={isLiveTab} onClick={() => setTab('live')} icon={<Wifi size={13} />} label="Live Rooms" />
        <TabButton
          active={!isLiveTab}
          onClick={() => setTab('archived')}
          icon={<Archive size={13} />}
          label="Archived Rooms"
        />
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Swords} label="Total Rooms" value={stats.total} variant="rooms" />
        <StatCard icon={Zap} label="Active" value={stats.active} variant="active" />
        <StatCard icon={Clock} label="Waiting" value={stats.waiting} variant="waiting" />
        <StatCard icon={Wifi} label="Playing" value={stats.playing} variant="online" />
        <StatCard icon={CheckCircle} label="Finished" value={stats.finished} variant="finished" />
        <StatCard icon={Coins} label="With Bet" value={stats.withBet} variant="bets" />
      </div>

      {/* Search + filters */}
      <GlassCard className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search room code, host, guest, UID…"
          />
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_FILTERS.map((sf) => (
                <FilterChip
                  key={sf.value}
                  active={statusFilter === sf.value}
                  onClick={() => setStatusFilter(sf.value)}
                  label={sf.label}
                />
              ))}
            </div>
            <span className="hidden h-5 w-px bg-glass-border lg:block" aria-hidden />
            <div className="flex flex-wrap items-center gap-1.5">
              {BET_FILTERS.map((bf) => (
                <FilterChip
                  key={bf.value}
                  active={betFilter === bf.value}
                  onClick={() => setBetFilter(bf.value)}
                  label={bf.label}
                  variant="cyan"
                />
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Error */}
      {activeError && (
        <ErrorState
          title={isLiveTab ? 'Failed to load live rooms' : 'Failed to load archived rooms'}
          message={activeError}
          code={(activeError as RtdbError).code}
          path={
            isLiveTab
              ? `${RTDB_DATABASE_URL}/rooms`
              : 'firestore: online_room_history'
          }
          hint={
            isLiveTab &&
            ((activeError as RtdbError).code === 'permission_denied' ||
              (activeError as RtdbError).code === 'database/permission-denied')
              ? 'Confirm /rooms allows .read for authenticated users in database.rules.json, then redeploy with: firebase deploy --only database'
              : isLiveTab
                ? 'Check Realtime Database rules for /rooms read access.'
                : undefined
          }
        />
      )}

      {/* List */}
      <GlassCard>
        {activeLoading ? (
          <SkeletonLoader rows={3} />
        ) : filteredRooms.length === 0 ? (
          <EmptyState
            icon={Swords}
            message={
              activeRooms.length === 0
                ? isLiveTab
                  ? 'No live rooms found in Realtime Database.'
                  : 'No archived rooms found in online_room_history.'
                : 'No rooms match these filters.'
            }
          />
        ) : (
          <div>
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.matchId || room.roomCode}
                room={room}
                usersById={usersMap}
                onSelect={setSelectedRoom}
              />
            ))}
          </div>
        )}
      </GlassCard>

      {!isLiveTab && archivedQuery.hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={archivedQuery.loadMore}
            className="rounded-xl border border-xo-border bg-xo-panel px-4 py-2 text-xs font-semibold text-xo-muted transition-colors hover:border-xo-border-active hover:text-xo-cyan"
          >
            Load more archived rooms
          </button>
        </div>
      )}

      <RoomDetailsDrawer
        open={selectedRoom != null}
        room={liveSelected}
        usersById={usersMap}
        onClose={() => setSelectedRoom(null)}
      />
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
        active
          ? 'bg-xo-cyan text-xo-bg-deep shadow-[0_0_12px_rgba(85,214,255,0.25)]'
          : 'text-gray-400 hover:bg-glass-hover hover:text-white'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  variant?: 'sky' | 'cyan';
}

function FilterChip({ active, onClick, label, variant = 'sky' }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
        active
          ? variant === 'cyan'
            ? 'border-xo-cyan bg-xo-cyan/20 text-xo-cyan shadow-[0_0_10px_rgba(85,214,255,0.2)]'
            : 'border-xo-cyan bg-xo-cyan text-xo-bg-deep shadow-[0_0_12px_rgba(85,214,255,0.22)]'
          : 'border-xo-border bg-xo-panel/60 text-xo-muted hover:border-xo-border-active hover:text-xo-text'
      )}
    >
      {label}
    </button>
  );
}
