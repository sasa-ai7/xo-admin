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
        'rounded-2xl border border-glass-border bg-glass-bg backdrop-blur-xl',
        hover && 'transition-all duration-300 hover:bg-glass-hover hover:border-neon-orange/30',
        className
      )}
    >
      {children}
    </div>
  );
}
