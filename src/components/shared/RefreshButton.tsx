import { useState, useCallback } from 'react';
import { RotateCw } from 'lucide-react';
import { IconBadge } from './IconBadge';

interface RefreshButtonProps {
  onRefresh?: () => void | Promise<void>;
  className?: string;
}

export function RefreshButton({ onRefresh, className = '' }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = useCallback(async () => {
    if (spinning) return;
    setSpinning(true);
    try {
      await onRefresh?.();
    } finally {
      // Keep spin for at least 600ms so it looks intentional
      setTimeout(() => setSpinning(false), 600);
    }
  }, [spinning, onRefresh]);

  return (
    <button
      onClick={handleClick}
      aria-label="Refresh"
      title="Refresh"
      className={[
        'group relative flex h-8 w-8 items-center justify-center rounded-full',
        'border border-xo-border bg-xo-panel/70 backdrop-blur-sm',
        'text-xo-cyan/75 transition-all duration-300',
        'hover:border-xo-border-active hover:bg-xo-cyan/10 hover:text-xo-cyan',
        'hover:shadow-[0_0_18px_rgba(85,214,255,0.24)]',
        'active:scale-90',
        className,
      ].join(' ')}
    >
      <IconBadge icon={RotateCw} variant="active" size="xs" glow={false} pulse={spinning} className="border-0 bg-transparent shadow-none" iconClassName={spinning ? 'animate-spin' : 'transition-transform duration-300 group-hover:rotate-45'} />
    </button>
  );
}
