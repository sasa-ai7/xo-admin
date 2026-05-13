import { cn } from '../../utils/cn';

interface SkeletonLoaderProps {
  rows?: number;
  className?: string;
}

export function SkeletonLoader({ rows = 5, className }: SkeletonLoaderProps) {
  return (
    <div className={cn('space-y-3 p-4', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-16 animate-pulse rounded bg-glass-hover" />
          <div className="h-4 flex-1 animate-pulse rounded bg-glass-hover" />
          <div className="h-4 w-24 animate-pulse rounded bg-glass-hover" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-glass-border bg-glass-bg p-5 backdrop-blur-xl"
        >
          <div className="h-10 w-10 animate-pulse rounded-xl bg-glass-hover" />
          <div className="mt-4 h-7 w-24 animate-pulse rounded bg-glass-hover" />
          <div className="mt-2 h-3 w-16 animate-pulse rounded bg-glass-hover" />
        </div>
      ))}
    </div>
  );
}
