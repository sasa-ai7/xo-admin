import { cn } from '../../utils/cn';
import type { RoomStatus } from '../../types/room';
import { Ban, CheckCircle2, CircleHelp, Clock, Hourglass, PlayCircle, Radio, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatusBadgeProps {
  status?: RoomStatus | string | null;
  size?: 'xs' | 'sm';
  className?: string;
}

interface StatusVisual {
  label: string;
  /** Tailwind classes for background + text colour. */
  cls: string;
  /** Whether to add a soft pulse animation (active matches). */
  pulse?: boolean;
  icon?: LucideIcon;
}

const STATUS_VISUALS: Record<RoomStatus, StatusVisual> = {
  waiting: { label: 'Waiting', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: Clock },
  ready: { label: 'Ready', cls: 'bg-xo-cyan/10 text-xo-cyan border-xo-cyan/30', icon: CheckCircle2 },
  countdown: { label: 'Countdown', cls: 'bg-xo-blue/10 text-xo-sky border-xo-blue/30', pulse: true, icon: Hourglass },
  playing: { label: 'Playing', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', pulse: true, icon: PlayCircle },
  round_end: { label: 'Round End', cls: 'bg-xo-purple/10 text-xo-purple border-xo-purple/30', icon: Radio },
  finished: { label: 'Finished', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: Trophy },
  abandoned: { label: 'Abandoned', cls: 'bg-xo-danger/10 text-xo-danger border-xo-danger/30', icon: Ban },
  expired: { label: 'Expired', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30', icon: Clock },
  cancelled: { label: 'Cancelled', cls: 'bg-red-500/10 text-red-400 border-red-500/30', icon: Ban },
};

const FALLBACK_VISUAL: StatusVisual = {
  label: 'Unknown',
  cls: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  icon: CircleHelp,
};

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const key = (status ?? '').toString().toLowerCase() as RoomStatus;
  const visual = STATUS_VISUALS[key] ?? FALLBACK_VISUAL;
  const labelText = visual === FALLBACK_VISUAL && status ? String(status) : visual.label;
  const Icon = visual.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[11px]',
        visual.cls,
        className
      )}
    >
      {visual.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {Icon && <Icon size={size === 'xs' ? 10 : 12} strokeWidth={2.4} />}
      {labelText}
    </span>
  );
}
