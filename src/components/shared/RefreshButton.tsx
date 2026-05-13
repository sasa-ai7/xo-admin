import { useState, useCallback } from 'react';
import { RotateCw } from 'lucide-react';

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
        'border border-neon-orange/30 bg-black/40 backdrop-blur-sm',
        'text-neon-orange/60 transition-all duration-300',
        'hover:border-neon-orange/70 hover:bg-neon-orange/10 hover:text-neon-orange',
        'hover:shadow-[0_0_14px_rgba(255,85,0,0.35)]',
        'active:scale-90',
        className,
      ].join(' ')}
    >
      {/* Outer glow ring – pulses once when spinning */}
      <span
        className={[
          'absolute inset-0 rounded-full border border-neon-orange/40 transition-opacity duration-300',
          spinning ? 'animate-ping opacity-60' : 'opacity-0 group-hover:opacity-40',
        ].join(' ')}
      />
      <RotateCw
        size={14}
        strokeWidth={2.5}
        className={spinning ? 'animate-spin' : 'transition-transform duration-300 group-hover:rotate-45'}
      />
    </button>
  );
}
