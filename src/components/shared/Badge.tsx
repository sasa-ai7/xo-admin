import { cn } from '../../utils/cn';

type BadgeVariant = 'cyan' | 'green' | 'amber' | 'red' | 'gray' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  cyan: 'border-xo-cyan/25 bg-xo-cyan/10 text-xo-cyan',
  green: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-400/25 bg-amber-500/10 text-amber-300',
  red: 'border-rose-400/25 bg-red-500/10 text-rose-300',
  gray: 'border-white/10 bg-white/[0.06] text-gray-300',
  purple: 'border-xo-violet/25 bg-xo-violet/10 text-xo-violet',
};

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
