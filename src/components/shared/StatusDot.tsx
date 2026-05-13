import { cn } from '../../utils/cn';

interface StatusDotProps {
  online?: boolean;
  className?: string;
}

export function StatusDot({ online = false, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block h-2.5 w-2.5 rounded-full',
        online
          ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]'
          : 'bg-gray-500',
        className
      )}
    />
  );
}
