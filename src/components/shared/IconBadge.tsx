import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type IconBadgeVariant =
  | 'users'
  | 'online'
  | 'rooms'
  | 'archive'
  | 'active'
  | 'waiting'
  | 'finished'
  | 'bets'
  | 'deletion'
  | 'audit'
  | 'purchase'
  | 'coins'
  | 'revenue'
  | 'duplicate'
  | 'failed'
  | 'avatar'
  | 'settings'
  | 'watchlist'
  | 'referrals'
  | 'logs'
  | 'neutral';

type IconBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface IconBadgeProps {
  icon?: LucideIcon;
  children?: ReactNode;
  variant?: IconBadgeVariant;
  size?: IconBadgeSize;
  active?: boolean;
  pulse?: boolean;
  glow?: boolean;
  hex?: boolean;
  className?: string;
  iconClassName?: string;
}

const sizeStyles: Record<IconBadgeSize, { wrap: string; icon: number; child: string }> = {
  xs: { wrap: 'h-7 w-7 rounded-lg', icon: 13, child: 'max-h-4 max-w-4' },
  sm: { wrap: 'h-9 w-9 rounded-xl', icon: 16, child: 'max-h-5 max-w-5' },
  md: { wrap: 'h-11 w-11 rounded-2xl', icon: 19, child: 'max-h-6 max-w-6' },
  lg: { wrap: 'h-14 w-14 rounded-[1.2rem]', icon: 24, child: 'max-h-8 max-w-8' },
  xl: { wrap: 'h-16 w-16 rounded-[1.35rem]', icon: 28, child: 'max-h-10 max-w-10' },
};

const variantStyles: Record<IconBadgeVariant, string> = {
  users: 'border-xo-cyan/35 from-xo-cyan/20 via-xo-sky/10 to-xo-blue/5 text-xo-cyan shadow-[0_0_24px_rgba(85,214,255,0.16)]',
  online: 'border-emerald-300/35 from-emerald-400/20 via-xo-cyan/10 to-emerald-500/5 text-emerald-300 shadow-[0_0_24px_rgba(52,211,153,0.16)]',
  rooms: 'border-xo-sky/35 from-xo-sky/20 via-xo-cyan/10 to-xo-blue/5 text-xo-sky shadow-[0_0_24px_rgba(56,189,248,0.16)]',
  archive: 'border-xo-purple/35 from-xo-purple/20 via-xo-blue/10 to-xo-purple/5 text-xo-purple shadow-[0_0_24px_rgba(167,139,250,0.14)]',
  active: 'border-xo-cyan/40 from-xo-cyan/25 via-xo-aqua/10 to-xo-blue/5 text-xo-cyan shadow-[0_0_28px_rgba(85,214,255,0.2)]',
  waiting: 'border-amber-300/35 from-amber-400/18 via-amber-300/10 to-xo-bg-soft text-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.13)]',
  finished: 'border-emerald-300/35 from-emerald-400/18 via-emerald-300/10 to-xo-bg-soft text-emerald-300 shadow-[0_0_22px_rgba(52,211,153,0.14)]',
  bets: 'border-xo-aqua/35 from-xo-aqua/20 via-xo-cyan/10 to-xo-blue/5 text-xo-aqua shadow-[0_0_24px_rgba(34,211,238,0.16)]',
  deletion: 'border-xo-danger/35 from-xo-danger/20 via-rose-400/10 to-xo-bg-soft text-xo-danger shadow-[0_0_22px_rgba(251,113,133,0.13)]',
  audit: 'border-xo-blue/35 from-xo-blue/20 via-xo-cyan/10 to-xo-bg-soft text-xo-sky shadow-[0_0_22px_rgba(14,165,233,0.14)]',
  purchase: 'border-emerald-300/35 from-emerald-400/20 via-xo-cyan/10 to-xo-bg-soft text-emerald-300 shadow-[0_0_22px_rgba(52,211,153,0.14)]',
  coins: 'border-amber-200/35 from-amber-300/20 via-xo-cyan/10 to-xo-bg-soft text-amber-200 shadow-[0_0_22px_rgba(251,191,36,0.14)]',
  revenue: 'border-emerald-300/35 from-emerald-300/20 via-xo-cyan/12 to-xo-bg-soft text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.15)]',
  duplicate: 'border-amber-300/35 from-amber-400/18 via-xo-cyan/8 to-xo-bg-soft text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.12)]',
  failed: 'border-xo-danger/40 from-xo-danger/22 via-red-400/10 to-xo-bg-soft text-xo-danger shadow-[0_0_22px_rgba(251,113,133,0.16)]',
  avatar: 'border-xo-purple/35 from-xo-purple/20 via-xo-cyan/8 to-xo-bg-soft text-xo-purple shadow-[0_0_22px_rgba(167,139,250,0.15)]',
  settings: 'border-slate-300/25 from-slate-300/14 via-xo-cyan/8 to-xo-bg-soft text-slate-200 shadow-[0_0_20px_rgba(148,163,184,0.12)]',
  watchlist: 'border-xo-purple/35 from-xo-purple/20 via-xo-cyan/10 to-xo-bg-soft text-xo-purple shadow-[0_0_24px_rgba(167,139,250,0.15)]',
  referrals: 'border-xo-aqua/35 from-xo-aqua/20 via-xo-cyan/10 to-xo-bg-soft text-xo-aqua shadow-[0_0_24px_rgba(34,211,238,0.15)]',
  logs: 'border-xo-cyan/35 from-xo-cyan/18 via-xo-blue/10 to-xo-bg-soft text-xo-cyan shadow-[0_0_22px_rgba(85,214,255,0.14)]',
  neutral: 'border-xo-border from-white/[0.06] via-xo-cyan/8 to-xo-bg-soft text-xo-muted shadow-[0_0_18px_rgba(85,214,255,0.08)]',
};

export function IconBadge({
  icon: Icon,
  children,
  variant = 'neutral',
  size = 'md',
  active = false,
  pulse = false,
  glow = true,
  hex = false,
  className,
  iconClassName,
}: IconBadgeProps) {
  const sizes = sizeStyles[size];

  return (
    <span
      className={cn(
        'group/icon relative inline-flex shrink-0 items-center justify-center overflow-hidden border bg-gradient-to-br backdrop-blur-md transition-all duration-300',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]',
        'after:pointer-events-none after:absolute after:inset-x-2 after:top-1 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/35 after:to-transparent',
        sizes.wrap,
        variantStyles[variant],
        hex && '[clip-path:polygon(18%_0,82%_0,100%_28%,100%_72%,82%_100%,18%_100%,0_72%,0_28%)]',
        glow && 'hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(85,214,255,0.2)]',
        active && 'border-xo-border-active ring-1 ring-xo-cyan/30',
        pulse && 'animate-xo-pulse',
        className
      )}
    >
      <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/icon:opacity-100 animate-border-scan" />
      {pulse && <span className="absolute end-1 top-1 h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" />}
      {Icon ? (
        <Icon size={sizes.icon} strokeWidth={2.25} className={cn('relative z-10 drop-shadow-[0_0_8px_currentColor]', iconClassName)} />
      ) : (
        <span className={cn('relative z-10 inline-flex items-center justify-center', sizes.child, iconClassName)}>
          {children}
        </span>
      )}
    </span>
  );
}
