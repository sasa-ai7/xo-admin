import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface StatsCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
  valueClassName?: string;
  onClick?: () => void;
}

export function StatsCard({
  label,
  value,
  hint,
  className,
  valueClassName,
  onClick,
}: StatsCardProps) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full max-w-full min-w-0 rounded-2xl border border-glass-border/50 bg-black/30 px-3 py-3 text-left backdrop-blur-sm',
        onClick && 'transition-colors hover:bg-neon-orange/10 hover:border-neon-orange/30',
        className
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.24em] text-gray-600">{label}</p>
      <div className={cn('mt-1 break-words text-sm text-white/90', valueClassName)}>{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-gray-500">{hint}</div> : null}
    </Tag>
  );
}
