import { cn } from '../../utils/cn';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'xo-card relative overflow-hidden',
        hover && 'xo-card-interactive',
        className
      )}
    >
      {children}
    </div>
  );
}
