import { useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  CircleSlash,
  Coins,
  Flag,
  LogOut,
  PlayCircle,
  Plus,
  Sparkles,
  Timer,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatAbsoluteTime, formatRelativeTime } from '../../utils/relativeTime';
import { shortUid } from '../../utils/avatar';
import type { ArenaRoom, RoomPlayerEntry } from '../../types/room';

interface RoomTimelineProps {
  room: ArenaRoom;
}

interface TimelineEntry {
  id: string;
  icon: LucideIcon;
  label: string;
  detail?: string;
  at?: number;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getGuestJoinedAt(room: ArenaRoom): number | undefined {
  if (!room.guestUid || !room.players) return undefined;
  const direct = room.players[room.guestUid];
  if (direct && typeof direct.joinedAt === 'number') return direct.joinedAt;
  for (const entry of Object.values(room.players) as RoomPlayerEntry[]) {
    if (entry?.uid === room.guestUid && typeof entry.joinedAt === 'number') {
      return entry.joinedAt;
    }
  }
  return undefined;
}

function buildEntries(room: ArenaRoom): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  if (room.createdAt != null) {
    entries.push({
      id: 'created',
      icon: Plus,
      label: 'Room created',
      at: asNumber(room.createdAt),
      tone: 'info',
    });
  }

  const guestJoined = getGuestJoinedAt(room);
  if (guestJoined != null) {
    entries.push({
      id: 'guest_joined',
      icon: UserPlus,
      label: 'Guest joined',
      detail: room.guestName ?? (room.guestUid ? shortUid(room.guestUid) : undefined),
      at: guestJoined,
    });
  }

  if (room.startedAt != null) {
    entries.push({
      id: 'started',
      icon: PlayCircle,
      label: 'Match started',
      at: asNumber(room.startedAt),
      tone: 'success',
    });
  }

  if (room.betEnabled && (room.betAmount ?? 0) > 0) {
    entries.push({
      id: 'bet',
      icon: Coins,
      label: 'Bet locked',
      detail: `${room.betAmount} coins · prize ${room.prizePool ?? room.potAmount ?? '—'}`,
      at: asNumber(room.startedAt ?? room.createdAt),
      tone: 'warning',
    });
  }

  if (room.cancelledAt != null) {
    entries.push({
      id: 'cancelled',
      icon: CircleSlash,
      label: 'Cancelled',
      detail: room.cancelledByUid ? `by ${shortUid(room.cancelledByUid)}` : undefined,
      at: asNumber(room.cancelledAt),
      tone: 'danger',
    });
  }

  if (room.leftAt != null) {
    entries.push({
      id: 'left',
      icon: LogOut,
      label: 'Player left',
      detail: room.leftByUid ? shortUid(room.leftByUid) : undefined,
      at: asNumber(room.leftAt),
      tone: 'danger',
    });
  }

  if (room.status === 'expired' && room.expiresAt != null) {
    entries.push({
      id: 'expired',
      icon: Timer,
      label: 'Room expired',
      at: asNumber(room.expiresAt),
      tone: 'warning',
    });
  }

  const finishedAt = asNumber(room.finishedAt) ?? (room.isTerminal ? asNumber(room.updatedAt) : undefined);
  if (finishedAt != null) {
    entries.push({
      id: 'finished',
      icon: Flag,
      label: 'Match finished',
      at: finishedAt,
      tone: 'success',
    });
  }

  const winnerUid = room.roomWinnerUid ?? room.winnerUid;
  if (winnerUid) {
    entries.push({
      id: 'winner',
      icon: Award,
      label: 'Winner declared',
      detail: shortUid(winnerUid),
      at: finishedAt,
      tone: 'success',
    });
  }

  if (room.prizePaid) {
    entries.push({
      id: 'prize_paid',
      icon: Sparkles,
      label: 'Prize paid',
      at: finishedAt,
      tone: 'success',
    });
  }

  if (room.payoutApplied && !room.prizePaid) {
    entries.push({
      id: 'payout',
      icon: CheckCircle2,
      label: 'Payout applied',
      at: finishedAt,
      tone: 'success',
    });
  }

  return entries.sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
}

const TONE_CLASSES: Record<NonNullable<TimelineEntry['tone']>, string> = {
  default: 'bg-glass-bg text-gray-400 border-glass-border',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/10 text-red-400 border-red-500/30',
  info: 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30',
};

export function RoomTimeline({ room }: RoomTimelineProps) {
  const entries = useMemo(() => buildEntries(room), [room]);
  if (entries.length === 0) {
    return (
      <p className="text-xs text-gray-500">
        Timeline unavailable — no timed events recorded on this room.
      </p>
    );
  }

  return (
    <ol className="relative space-y-3 ps-4">
      <span className="absolute inset-y-1 start-[7px] w-px bg-glass-border" aria-hidden />
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span
            className={cn(
              'absolute -start-4 top-1 flex h-4 w-4 items-center justify-center rounded-full border',
              TONE_CLASSES[e.tone ?? 'default']
            )}
          >
            <e.icon size={9} />
          </span>
          <div className="ms-2">
            <p className="text-xs font-semibold text-white">{e.label}</p>
            {e.detail && <p className="text-[11px] text-gray-400">{e.detail}</p>}
            {e.at != null && (
              <p className="mt-0.5 text-[10px] text-gray-500">
                {formatAbsoluteTime(e.at)} · {formatRelativeTime(e.at)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
