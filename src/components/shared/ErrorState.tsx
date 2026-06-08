import { AlertTriangle } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { cn } from '../../utils/cn';
import { IconBadge } from './IconBadge';

interface ErrorStateProps {
  title?: string;
  message: string | Error | null | undefined;
  code?: string;
  path?: string;
  hint?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  code,
  path,
  hint,
  onRetry,
  className,
}: ErrorStateProps) {
  const text =
    message instanceof Error
      ? message.message || message.name
      : typeof message === 'string'
        ? message
        : '';

  return (
    <GlassCard className={cn('border-xo-danger/35 bg-xo-danger/[0.045] p-4', className)}>
      <div className="flex items-start gap-3">
        <IconBadge icon={AlertTriangle} variant="failed" size="md" hex pulse />
        <div className="min-w-0 flex-1">
          <p className="font-orbitron text-sm font-bold text-red-100">{title}</p>
          {text && <p className="mt-1 break-words text-xs text-red-100/80">{text}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {code && (
              <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-red-300/80">
                code: {code}
              </span>
            )}
            {path && (
              <span className="inline-flex items-center rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] text-red-200/80">
                path: {path}
              </span>
            )}
          </div>
          {hint && <p className="mt-2 text-[11px] text-red-100/70">{hint}</p>}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center rounded-lg border border-xo-danger/40 bg-xo-danger/10 px-3 py-1.5 text-[11px] font-semibold text-red-100 transition-colors hover:bg-xo-danger/20"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
