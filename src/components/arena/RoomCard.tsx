import { Archive, ChevronRight, Clock, Coins, Hash, Swords, Trophy } from 'lucide-react';
import { StatusBadge } from '../shared/StatusBadge';
import { CopyButton } from '../shared/CopyButton';
import { UserAvatar } from '../shared/UserAvatar';
import { IconBadge } from '../shared/IconBadge';
import { cn } from '../../utils/cn';
import { resolveRoomGuestAvatar, resolveRoomHostAvatar, shortUid } from '../../utils/avatar';
import { formatRelativeTime } from '../../utils/relativeTime';
import { formatNumber } from '../../utils/formatters';
import type { ArenaRoom } from '../../types/room';
import type { AppUser } from '../../types/user';

interface RoomCardProps {
  room: ArenaRoom;
  usersById?: Map<string, AppUser>;
  onSelect?: (room: ArenaRoom) => void;
}

export function RoomCard({ room, usersById, onSelect }: RoomCardProps) {
  const host = resolveRoomHostAvatar(room, usersById);
  const guest = resolveRoomGuestAvatar(room, usersById);
  const created = typeof room.createdAt === 'number' ? room.createdAt : undefined;
  const totalRounds = room.roundsCount ?? (Array.isArray(room.rounds) ? room.rounds.length : undefined);
  const currentRound = room.currentRound ?? room.currentRoundIndex;
  const boardDim =
    room.boardSize ??
    (Array.isArray(room.board)
      ? room.board.length === 9
        ? 3
        : room.board.length === 16
          ? 4
          : room.board.length === 25
            ? 5
            : undefined
      : undefined);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(room)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(room);
        }
      }}
      className="group flex w-full cursor-pointer flex-col gap-3 border-b border-glass-border px-4 py-3.5 text-start transition-colors last:border-b-0 hover:bg-glass-hover focus:bg-glass-hover focus:outline-none"
    >
      {/* Top row: code, status, bet, archived flag */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-neon-cyan/10 px-2 py-0.5 font-mono text-sm font-semibold text-neon-cyan">
          <IconBadge icon={Hash} variant="rooms" size="xs" hex className="h-5 w-5 rounded-md border-0 bg-transparent shadow-none" />
          {room.roomCode}
        </span>
        <CopyButton value={room.roomCode} label="room code" size="xs" />
        <StatusBadge status={room.status} />
        {room.betEnabled && (
          <span className="inline-flex items-center gap-1 rounded-full border border-xo-cyan/30 bg-xo-cyan/10 px-2 py-0.5 text-[11px] font-semibold text-xo-cyan">
            <Coins size={11} />
            {typeof room.betAmount === 'number' ? formatNumber(room.betAmount) : 'Bet'}
          </span>
        )}
        {!room.betEnabled && (
          <span className="rounded-full border border-glass-border bg-black/30 px-2 py-0.5 text-[10px] font-medium text-gray-500">
            No Bet
          </span>
        )}
        {room.isArchived && (
          <span className="inline-flex items-center gap-1 rounded-full border border-gray-500/30 bg-gray-500/10 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
            <Archive size={10} />
            Archived
          </span>
        )}
        <span className="ms-auto inline-flex items-center gap-1 text-[10px] text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
          View details
          <ChevronRight size={12} />
        </span>
      </div>

      {/* Players row */}
      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <PlayerStub
          avatar={host}
          uid={room.hostUid}
          side={room.xUid === room.hostUid ? 'X' : room.oUid === room.hostUid ? 'O' : undefined}
          label="Host"
        />
        <div className="flex items-center justify-center">
          <span className="font-orbitron text-[10px] font-bold tracking-[0.3em] text-gray-500">
            VS
          </span>
        </div>
        {room.hasGuest ? (
          <PlayerStub
            avatar={guest}
            uid={room.guestUid}
            side={room.xUid === room.guestUid ? 'X' : room.oUid === room.guestUid ? 'O' : undefined}
            label="Guest"
            align="end"
          />
        ) : (
          <div className="flex items-center justify-end gap-2 rounded-xl border border-dashed border-glass-border px-3 py-2 text-xs text-gray-500">
            <span className="h-7 w-7 rounded-full border border-dashed border-gray-700" />
            Waiting for opponent
          </div>
        )}
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
        {totalRounds && (
          <span className="inline-flex items-center gap-1">
            <Swords size={11} className="text-gray-600" />
            Round {currentRound ?? 1}/{totalRounds}
          </span>
        )}
        {boardDim && (
          <span>
            Board {boardDim}×{boardDim}
          </span>
        )}
        {typeof room.movesCount === 'number' && room.movesCount > 0 && (
          <span>{room.movesCount} moves</span>
        )}
        {typeof (room.prizePool ?? room.potAmount) === 'number' &&
          (room.prizePool ?? room.potAmount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-neon-cyan/80">
              <Trophy size={11} className="text-neon-cyan/70" />
              Prize {formatNumber(room.prizePool ?? room.potAmount ?? 0)}
            </span>
          )}
        {room.isArchived && (room.finalResult ?? room.resultReason ?? room.result) && (
          <span className="inline-flex items-center gap-1 text-gray-400">
            Result:{' '}
            <span className="font-mono text-gray-300">
              {room.finalResult ?? room.resultReason ?? room.result}
            </span>
          </span>
        )}
        {created && (
          <span className="inline-flex items-center gap-1">
            <Clock size={11} className="text-gray-600" />
            {formatRelativeTime(created)}
          </span>
        )}
      </div>
    </div>
  );
}

interface PlayerStubProps {
  avatar: ReturnType<typeof resolveRoomHostAvatar>;
  uid?: string;
  side?: 'X' | 'O';
  label: string;
  align?: 'start' | 'end';
}

function PlayerStub({ avatar, uid, side, label, align = 'start' }: PlayerStubProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-xl border border-glass-border bg-black/30 px-3 py-2',
        align === 'end' && 'sm:flex-row-reverse sm:text-end'
      )}
    >
      <UserAvatar
        photoURL={avatar.photoURL ?? null}
        displayName={avatar.name ?? null}
        equippedAvatar={avatar.equippedAvatar ?? null}
        size="md"
      />
      <div className={cn('min-w-0 flex-1', align === 'end' && 'sm:text-end')}>
        <div className="flex items-center gap-1.5 truncate">
          <span className="truncate text-sm font-semibold text-white">{avatar.name ?? '—'}</span>
          {side && (
            <span
              className={cn(
                'inline-flex h-4 w-4 items-center justify-center rounded font-mono text-[10px] font-bold',
                side === 'X'
                  ? 'bg-xo-cyan/10 text-xo-cyan'
                  : 'bg-xo-sky/10 text-xo-sky'
              )}
            >
              {side}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500">
          <span className="font-orbitron uppercase tracking-wider text-gray-600">{label}</span>
          {uid && (
            <>
              <span>·</span>
              <span className="font-mono">{shortUid(uid)}</span>
              <CopyButton value={uid} label={`${label} UID`} size="xs" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
