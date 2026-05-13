import { cn } from '../../utils/cn';

type BadgeVariant = 'orange' | 'cyan' | 'green' | 'red' | 'gray' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  orange: 'bg-neon-orange/10 text-neon-orange',
  cyan: 'bg-neon-cyan/10 text-neon-cyan',
  green: 'bg-emerald-500/10 text-emerald-400',
  red: 'bg-red-500/10 text-red-400',
  gray: 'bg-gray-500/10 text-gray-400',
  purple: 'bg-neon-purple/10 text-neon-purple',
};

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
