import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { IconBadge, type IconBadgeVariant } from './IconBadge';
import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  /** Optional small helper line under the label. */
  hint?: ReactNode;
  trend?: { value: number; positive: boolean };
  variant?: IconBadgeVariant;
  /** Custom formatter applied when value is a number (and animated). */
  format?: (n: number) => string;
  /** Disable the count-up animation for numeric values. */
  animate?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  trend,
  variant = 'active',
  format,
  animate = true,
  onClick,
  className,
}: StatCardProps) {
  const Tag = onClick ? 'button' : 'div';
  const numeric = typeof value === 'number';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'xo-card xo-card-interactive xo-rim group p-5 text-start',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <IconBadge icon={Icon} variant={variant} size="md" hex glow />
        {trend && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
              trend.positive
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            )}
          >
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="mt-4 font-orbitron text-2xl font-bold tabular-nums text-xo-text">
        {numeric && animate ? (
          <AnimatedNumber value={value} format={format} />
        ) : numeric && format ? (
          format(value)
        ) : (
          value
        )}
      </p>
      <p className="mt-1 text-xs text-xo-muted">{label}</p>
      {hint ? <p className="mt-1 text-[11px] text-xo-muted/70">{hint}</p> : null}
    </Tag>
  );
}
