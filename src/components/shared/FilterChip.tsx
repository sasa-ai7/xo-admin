import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface FilterChipProps {
  active?: boolean;
  onClick?: () => void;
  icon?: LucideIcon;
  /** Optional trailing count bubble. */
  count?: number;
  children: ReactNode;
  className?: string;
}

/**
 * Unified filter / segmented pill used across pages (replaces the bespoke
 * inline chip markup that was duplicated in several pages).
 */
export function FilterChip({ active = false, onClick, icon: Icon, count, children, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all duration-200',
        active
          ? 'border-xo-cyan/40 bg-xo-cyan/10 text-xo-cyan shadow-[0_0_14px_rgba(85,214,255,0.16)]'
          : 'border-xo-border/70 bg-white/[0.02] text-xo-muted hover:border-xo-cyan/25 hover:text-xo-text',
        className
      )}
    >
      {Icon ? <Icon size={12} className="shrink-0" /> : null}
      <span>{children}</span>
      {count != null && (
        <span
          className={cn(
            'ms-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums',
            active ? 'bg-xo-cyan/20 text-xo-cyan' : 'bg-white/5 text-xo-muted'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function ChipGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-1.5', className)}>{children}</div>;
}
