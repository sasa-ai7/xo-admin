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
        'xo-card w-full max-w-full min-w-0 px-3.5 py-3 text-start',
        onClick && 'xo-card-interactive cursor-pointer',
        className
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.24em] text-xo-muted/80">{label}</p>
      <div className={cn('mt-1 break-words text-sm text-white/90', valueClassName)}>{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-xo-muted/70">{hint}</div> : null}
    </Tag>
  );
}
