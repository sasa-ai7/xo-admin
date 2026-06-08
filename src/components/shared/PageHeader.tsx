import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { IconBadge, type IconBadgeVariant } from './IconBadge';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  variant?: IconBadgeVariant;
  /** Right-aligned actions (buttons, refresh, etc.). */
  actions?: ReactNode;
  className?: string;
}

/** Unified page title block: icon badge + Orbitron title + optional subtitle + actions. */
export function PageHeader({ icon, title, subtitle, variant = 'active', actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <IconBadge icon={icon} variant={variant} size="md" hex glow />
        <div className="min-w-0">
          <h1 className="truncate font-orbitron text-lg font-bold text-xo-text sm:text-xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-xo-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
