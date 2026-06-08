import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { IconBadge } from './IconBadge';

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
}

export function EmptyState({ icon: Icon = Inbox, message }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden py-16 text-center">
      <div className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-xo-cyan/20 to-transparent" />
      <IconBadge icon={Icon} variant="logs" size="xl" hex className="animate-float-slow" />
      <p className="relative mt-4 max-w-sm text-sm text-xo-muted">{message}</p>
    </div>
  );
}
