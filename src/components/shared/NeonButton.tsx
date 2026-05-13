import { cn } from '../../utils/cn';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'blue' | 'cyan' | 'purple' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  blue: 'border-neon-blue/50 text-neon-blue hover:bg-neon-blue/10 hover:shadow-[0_0_15px_rgba(0,163,255,0.3)]',
  cyan: 'border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10 hover:shadow-[0_0_15px_rgba(0,229,255,0.3)]',
  purple: 'border-neon-purple/50 text-neon-purple hover:bg-neon-purple/10 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]',
  red: 'border-red-500/50 text-red-400 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function NeonButton({
  children,
  variant = 'blue',
  size = 'md',
  className,
  disabled,
  ...props
}: NeonButtonProps) {
  return (
    <button
      className={cn(
        'rounded-lg border font-medium transition-all duration-300',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
